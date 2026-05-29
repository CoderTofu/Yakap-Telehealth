import pool from "../db/pool";
import { createNotification } from "./notifications";

type Role = "patient" | "doctor";

type AuthUser = {
  id: string;
  email?: string;
  role: Role;
  name: string;
};

type HttpError = Error & { statusCode?: number };

function createHttpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function buildMeetingUrl(appointmentId: string) {
  return `https://meet.jit.si/yakap-${encodeURIComponent(appointmentId)}`;
}

function parseScheduledAtAsManila(iso: string) {
  if (typeof iso !== "string") return new Date(NaN);
  // If the string already has a timezone (Z or +/- offset), parse directly.
  if (/[zZ]$/.test(iso) || /[+\-]\d{2}:\d{2}$/.test(iso)) return new Date(iso);
  // Otherwise treat it as local Asia/Manila time by appending +08:00
  return new Date(iso + "+08:00");
}

function formatNotificationSchedule(iso: string) {
  const date = parseScheduledAtAsManila(iso);

  if (Number.isNaN(date.getTime())) {
    return "an unknown time";
  }

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  })
    .format(date)
    .replace(/\s/g, "")
    .toLowerCase();

  const calendarDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);

  return `${time} ${calendarDate}`;
}

async function autoCancelExpiredPendingAppointments() {
  const { rows } = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    scheduled_at: string;
    doctor_name: string;
    patient_name: string;
  }>(
    `UPDATE appointments a
     SET
       status = 'cancelled',
       cancelled_by = NULL,
       cancelled_at = COALESCE(cancelled_at, NOW()),
       rejection_reason = COALESCE(rejection_reason, 'Automatically cancelled because the scheduled time has passed')
     FROM users doctor,
          users patient
     WHERE a.status = 'pending'
       AND a.scheduled_at <= NOW()
       AND doctor.id = a.doctor_id
       AND patient.id = a.patient_id
     RETURNING
       a.id,
       a.patient_id,
       a.doctor_id,
       a.scheduled_at::text,
       doctor.name AS doctor_name,
       patient.name AS patient_name`,
  );

  if (!rows.length) {
    return;
  }

  await Promise.all(
    rows.flatMap((appointment) => {
      const scheduledLabel = formatNotificationSchedule(appointment.scheduled_at);
      const patientMessage =
        `Your appointment scheduled for ${scheduledLabel} was automatically cancelled because the scheduled time passed.`;
      const doctorMessage =
        `The appointment with ${appointment.patient_name} scheduled for ${scheduledLabel} was automatically cancelled because the scheduled time passed.`;

      return [
        createNotification(appointment.patient_id, "appointment_cancelled", patientMessage),
        createNotification(appointment.doctor_id, "appointment_cancelled", doctorMessage),
      ];
    }),
  );
}

async function autoCompleteStaleConfirmedAppointments() {
  const { rows } = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    scheduled_at: string;
    doctor_name: string;
    patient_name: string;
  }>(
    `UPDATE appointments a
     SET
       status = 'completed',
       completed_at = COALESCE(completed_at, NOW())
     FROM users doctor,
          users patient
     WHERE a.status = 'confirmed'
       AND a.scheduled_at <= NOW() - INTERVAL '3 days'
       AND doctor.id = a.doctor_id
       AND patient.id = a.patient_id
     RETURNING
       a.id,
       a.patient_id,
       a.doctor_id,
       a.scheduled_at::text,
       doctor.name AS doctor_name,
       patient.name AS patient_name`,
  );

  if (!rows.length) {
    return;
  }

  await Promise.all(
    rows.flatMap((appointment) => {
      const scheduledLabel = formatNotificationSchedule(appointment.scheduled_at);
      const patientMessage =
        `Your confirmed appointment scheduled for ${scheduledLabel} was automatically marked completed after 3 days.`;
      const doctorMessage =
        `Your confirmed appointment with ${appointment.patient_name} scheduled for ${scheduledLabel} was automatically marked completed after 3 days.`;

      return [
        createNotification(appointment.patient_id, "appointment_completed", patientMessage),
        createNotification(appointment.doctor_id, "appointment_completed", doctorMessage),
      ];
    }),
  );
}

// Function to check if a doctor is available for a given time slot, considering their schedule, blocks, and existing appointments
async function assertDoctorAvailable(
  doctorId: string,
  scheduledAtIso: string,
  durationMinutes: number,
  excludeAppointmentId?: string,
) {
  const scheduledAt = parseScheduledAtAsManila(scheduledAtIso);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw createHttpError(400, "Invalid scheduled_at");
  }

  const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);

  // Compute weekday and time in Asia/Manila local time
  const manilaForParts = new Date(scheduledAt.getTime() + MANILA_OFFSET_MS);
  const dayOfWeek = manilaForParts.getUTCDay();
  const hh = String(manilaForParts.getUTCHours()).padStart(2, "0");
  const mm = String(manilaForParts.getUTCMinutes()).padStart(2, "0");
  const startTime = `${hh}:${mm}`;

  const weeklyResult = await pool.query<{ ok: number }>(
    `SELECT 1 AS ok
     FROM doctor_schedules
     WHERE doctor_id = $1
       AND day_of_week = $2
       AND is_blocked = FALSE
       AND start_time <= $3::time
       AND end_time >= ($3::time + ($4 || ' minutes')::interval)
     LIMIT 1`,
    [doctorId, dayOfWeek, startTime, durationMinutes],
  );

  if (!weeklyResult.rows[0]) {
    throw createHttpError(409, "Selected slot is outside doctor schedule");
  }

  const blockResult = await pool.query<{ starts_at: string; ends_at: string }>(
    `SELECT starts_at::text, ends_at::text
     FROM doctor_schedule_blocks
     WHERE doctor_id = $1
       AND starts_at < $3::timestamptz
       AND ends_at > $2::timestamptz
     LIMIT 1`,
    [doctorId, scheduledAt.toISOString(), endAt.toISOString()],
  );

  if (blockResult.rows[0]) {
    throw createHttpError(409, "Selected slot is blocked by doctor");
  }

  const conflictValues: Array<string> = [
    doctorId,
    scheduledAt.toISOString(),
    endAt.toISOString(),
  ];

  let conflictSql = `SELECT scheduled_at::text, duration_minutes
     FROM appointments
     WHERE doctor_id = $1
       AND status IN ('pending', 'confirmed')
       AND scheduled_at < $3::timestamptz
       AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $2::timestamptz`;

  if (excludeAppointmentId) {
    conflictValues.push(excludeAppointmentId);
    conflictSql += `
       AND id <> $4`;
  }

  const conflictResult = await pool.query<{
    scheduled_at: string;
    duration_minutes: number;
  }>(conflictSql, conflictValues);

  const hasConflict = conflictResult.rows.some((row) => {
    const existingStart = new Date(row.scheduled_at);
    const existingEnd = new Date(
      existingStart.getTime() + row.duration_minutes * 60 * 1000,
    );
    return overlaps(scheduledAt, endAt, existingStart, existingEnd);
  });

  if (hasConflict) {
    throw createHttpError(409, "Selected slot is already booked");
  }
}

export async function createAppointment(
  patient: AuthUser,
  input: {
    doctor_id?: string;
    scheduled_at?: string;
    duration_minutes?: number;
  },
) {
  const doctorId = input.doctor_id?.trim();
  const scheduledAt = input.scheduled_at;
  const duration = Number(input.duration_minutes ?? 30);

  if (!doctorId) {
    throw createHttpError(400, "doctor_id is required");
  }

  if (!scheduledAt) {
    throw createHttpError(400, "scheduled_at is required");
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw createHttpError(400, "duration_minutes must be a positive number");
  }

  // Look for the doctor for the appointment
  const doctorResult = await pool.query<{ id: string; name: string }>(
    `SELECT u.id, u.name
     FROM users u
     WHERE u.id = $1 AND u.role = 'doctor'
     LIMIT 1`,
    [doctorId],
  );

  const doctor = doctorResult.rows[0];

  if (!doctor) {
    throw createHttpError(404, "Doctor not found");
  }

  // Check if doctor is available
  await assertDoctorAvailable(doctorId, scheduledAt, duration);

  // Look for the patient for the appointment
  const patientResult = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM users WHERE id = $1 LIMIT 1`,
    [patient.id],
  );

  // If patient is not found by ID, try to find by email
  const resolvedPatient =
    patientResult.rows[0] ||
    (patient.email
      ? (
          await pool.query<{ id: string; name: string }>(
            `SELECT id, name FROM users WHERE email = $1 LIMIT 1`,
            [patient.email],
          )
        ).rows[0]
      : undefined);

  if (!resolvedPatient) {
    throw createHttpError(404, "Patient not found");
  }

  const patientId = resolvedPatient.id;
  const patientName = resolvedPatient.name ?? "Patient";

  // Create the appointment
  const { rows } = await pool.query(
    `INSERT INTO appointments (
      patient_id,
      doctor_id,
      scheduled_at,
      status,
      duration_minutes
    ) VALUES ($1, $2, $3::timestamptz, 'pending', $4)
    RETURNING
      id,
      patient_id,
      doctor_id,
      scheduled_at::text,
      status,
      duration_minutes,
      video_room_url,
      created_at::text`,
    [patientId, doctorId, scheduledAt, duration],
  );

  // Create notifications for both doctor and patient
  const scheduledLabel = formatNotificationSchedule(rows[0].scheduled_at);

  await Promise.all([
    createNotification(
      doctorId,
      "appointment_pending",
      `New appointment request from ${patientName} scheduled for ${scheduledLabel}.`,
    ),
    createNotification(
      patientId,
      "appointment_pending",
      `Appointment request sent to Dr. ${doctor.name} for ${scheduledLabel}.`,
    ),
  ]);

  return rows[0];
}

export async function listOwnAppointments(user: AuthUser) {
  await autoCancelExpiredPendingAppointments();
  await autoCompleteStaleConfirmedAppointments();

  const field = user.role === "doctor" ? "doctor_id" : "patient_id";

  const { rows } = await pool.query(
    `SELECT
      a.id,
      a.patient_id,
      a.doctor_id,
      a.scheduled_at::text,
      a.status,
      a.duration_minutes,
      a.video_room_url,
      a.approved_at::text,
      a.rejected_at::text,
      a.rejection_reason,
      a.cancelled_at::text,
      a.completed_at::text,
      a.rating,
      a.rated_at::text,
      a.created_at::text,
      doctor.name AS doctor_name,
      patient.name AS patient_name
     FROM appointments a
     JOIN users doctor ON doctor.id = a.doctor_id
     JOIN users patient ON patient.id = a.patient_id
     WHERE a.${field} = $1
     ORDER BY a.scheduled_at DESC`,
    [user.id],
  );

  return rows;
}

export async function rateAppointment(
  patientUser: AuthUser,
  appointmentId: string,
  rating: number,
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, "rating must be an integer between 1 and 5");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const appointmentResult = await client.query<{
      id: string;
      patient_id: string;
      doctor_id: string;
      status: string;
      rating: number | null;
      doctor_name: string;
    }>(
      `SELECT
        a.id,
        a.patient_id,
        a.doctor_id,
        a.status,
        a.rating,
        doctor.name AS doctor_name
       FROM appointments a
       JOIN users doctor ON doctor.id = a.doctor_id
       WHERE a.id = $1 AND a.patient_id = $2
       FOR UPDATE`,
      [appointmentId, patientUser.id],
    );

    const appointment = appointmentResult.rows[0];

    if (!appointment) {
      throw createHttpError(404, "Appointment not found");
    }

    if (appointment.status !== "completed") {
      throw createHttpError(409, "Only completed appointments can be rated");
    }

    const doctorProfileResult = await client.query<{
      rating: number | null;
      rating_count: number;
    }>(
      `SELECT rating, rating_count
       FROM doctor_profiles
       WHERE user_id = $1
       FOR UPDATE`,
      [appointment.doctor_id],
    );

    const doctorProfile = doctorProfileResult.rows[0];

    if (!doctorProfile) {
      throw createHttpError(404, "Doctor profile not found");
    }

    const currentRating = appointment.rating;
    const currentAverage = doctorProfile.rating;
    const currentCount = doctorProfile.rating_count ?? 0;

    let nextAverage = currentAverage;
    let nextCount = currentCount;

    if (currentRating === null) {
      nextCount = currentCount + 1;
      nextAverage =
        currentAverage === null
          ? rating
          : (currentAverage * currentCount + rating) / nextCount;
    } else {
      nextAverage =
        currentCount === 0 || currentAverage === null
          ? rating
          : (currentAverage * currentCount - currentRating + rating) /
            currentCount;
    }

    const updatedAppointment = await client.query(
      `UPDATE appointments
       SET rating = $2, rated_at = NOW()
       WHERE id = $1
       RETURNING id, patient_id, doctor_id, status, rating, rated_at::text`,
      [appointmentId, rating],
    );

    await client.query(
      `UPDATE doctor_profiles
       SET rating = $2, rating_count = $3
       WHERE user_id = $1`,
      [appointment.doctor_id, nextAverage, nextCount],
    );

    await client.query("COMMIT");

    return {
      ...updatedAppointment.rows[0],
      doctor_name: appointment.doctor_name,
      doctor_rating: nextAverage,
      doctor_rating_count: nextCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function decideAppointment(
  doctorUser: AuthUser,
  appointmentId: string,
  action: "approve" | "reject",
  reason?: string,
) {
  await autoCancelExpiredPendingAppointments();

  const appointmentResult = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    scheduled_at: string;
    status: string;
    duration_minutes: number;
    patient_name: string;
  }>(
    `SELECT
      a.id,
      a.patient_id,
      a.doctor_id,
      a.scheduled_at::text,
      a.status,
      a.duration_minutes,
      p.name AS patient_name
     FROM appointments a
     JOIN users p ON p.id = a.patient_id
     WHERE a.id = $1 AND a.doctor_id = $2
     LIMIT 1`,
    [appointmentId, doctorUser.id],
  );

  const appointment = appointmentResult.rows[0];

  if (!appointment) {
    throw createHttpError(404, "Appointment not found");
  }

  if (appointment.status !== "pending") {
    throw createHttpError(409, "Only pending appointments can be decided");
  }

  const scheduledLabel = formatNotificationSchedule(appointment.scheduled_at);

  if (action === "approve") {
    const videoRoomUrl = buildMeetingUrl(appointmentId);

    const { rows } = await pool.query(
      `UPDATE appointments
       SET
         status = 'confirmed',
         approved_at = NOW(),
         rejected_at = NULL,
         rejection_reason = NULL,
         video_room_url = $2
       WHERE id = $1
       RETURNING id, patient_id, doctor_id, scheduled_at::text, status, duration_minutes, video_room_url, approved_at::text`,
      [appointmentId, videoRoomUrl],
    );

    await Promise.all([
      createNotification(
        appointment.patient_id,
        "appointment_confirmed",
        `Dr. ${doctorUser.name} approved your appointment scheduled for ${scheduledLabel}.`,
      ),
      createNotification(
        doctorUser.id,
        "appointment_confirmed",
        `You approved an appointment from ${appointment.patient_name} scheduled for ${scheduledLabel}.`,
      ),
    ]);

    return rows[0];
  }

  const { rows } = await pool.query(
    `UPDATE appointments
     SET
       status = 'cancelled',
       rejected_at = NOW(),
       rejection_reason = $2
     WHERE id = $1
     RETURNING id, patient_id, doctor_id, scheduled_at::text, status, rejection_reason, rejected_at::text`,
    [appointmentId, reason ?? null],
  );

  await Promise.all([
    createNotification(
      appointment.patient_id,
      "appointment_rejected",
      `Dr. ${doctorUser.name} rejected your appointment scheduled for ${scheduledLabel}.`,
    ),
    createNotification(
      doctorUser.id,
      "appointment_rejected",
      `You rejected an appointment from ${appointment.patient_name} scheduled for ${scheduledLabel}.`,
    ),
  ]);

  return rows[0];
}

export async function getAppointmentMeetingLink(
  user: AuthUser,
  appointmentId: string,
) {
  const appointmentResult = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    scheduled_at: string;
    status: string;
    duration_minutes: number;
    video_room_url: string | null;
    doctor_name: string;
    patient_name: string;
  }>(
    `SELECT
      a.id,
      a.patient_id,
      a.doctor_id,
      a.scheduled_at::text,
      a.status,
      a.duration_minutes,
      a.video_room_url,
      doctor.name AS doctor_name,
      patient.name AS patient_name
     FROM appointments a
     JOIN users doctor ON doctor.id = a.doctor_id
     JOIN users patient ON patient.id = a.patient_id
     WHERE a.id = $1
       AND (a.doctor_id = $2 OR a.patient_id = $2)
     LIMIT 1`,
    [appointmentId, user.id],
  );

  const appointment = appointmentResult.rows[0];

  if (!appointment) {
    throw createHttpError(404, "Appointment not found");
  }

  if (appointment.status !== "confirmed") {
    throw createHttpError(409, "Meeting links are only available for confirmed appointments");
  }

  if (appointment.video_room_url) {
    return { video_room_url: appointment.video_room_url };
  }

  const meetLink = buildMeetingUrl(appointment.id);

  const { rows } = await pool.query(
    `UPDATE appointments
     SET video_room_url = $2
     WHERE id = $1
     RETURNING video_room_url`,
    [appointment.id, meetLink],
  );

  return { video_room_url: rows[0]?.video_room_url ?? meetLink };
}

export async function cancelAppointment(
  user: AuthUser,
  appointmentId: string,
  reason?: string,
) {
  const appointmentResult = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    status: string;
    scheduled_at: string;
    doctor_name: string;
    patient_name: string;
  }>(
    `SELECT
      a.id,
      a.patient_id,
      a.doctor_id,
      a.status,
      a.scheduled_at::text,
      doctor.name AS doctor_name,
      patient.name AS patient_name
     FROM appointments a
     JOIN users doctor ON doctor.id = a.doctor_id
     JOIN users patient ON patient.id = a.patient_id
     WHERE a.id = $1
       AND (a.patient_id = $2 OR a.doctor_id = $2)
     LIMIT 1`,
    [appointmentId, user.id],
  );

  const appointment = appointmentResult.rows[0];

  if (!appointment) {
    throw createHttpError(404, "Appointment not found");
  }

  if (!["pending", "confirmed"].includes(appointment.status)) {
    throw createHttpError(
      409,
      "Only pending or confirmed appointments can be cancelled",
    );
  }

  const { rows } = await pool.query(
    `UPDATE appointments
     SET
       status = 'cancelled',
       cancelled_by = $2,
       cancelled_at = NOW(),
       rejection_reason = COALESCE($3, rejection_reason)
     WHERE id = $1
     RETURNING id, patient_id, doctor_id, status, cancelled_by, cancelled_at::text, rejection_reason`,
    [appointmentId, user.id, reason ?? null],
  );

  const counterpartId =
    appointment.patient_id === user.id
      ? appointment.doctor_id
      : appointment.patient_id;
  const scheduledLabel = formatNotificationSchedule(appointment.scheduled_at);

  const counterpartMessage =
    user.role === "doctor"
      ? `Dr. ${user.name} cancelled your appointment scheduled for ${scheduledLabel}.`
      : `${user.name} cancelled your appointment scheduled for ${scheduledLabel}.`;

  const actorMessage =
    user.role === "doctor"
      ? `You cancelled an appointment from ${appointment.patient_name} scheduled for ${scheduledLabel}.`
      : `You cancelled your appointment with Dr. ${appointment.doctor_name} scheduled for ${scheduledLabel}.`;

  await Promise.all([
    createNotification(
      counterpartId,
      "appointment_cancelled",
      counterpartMessage,
    ),
    createNotification(
      user.id,
      "appointment_cancelled",
      actorMessage,
    ),
  ]);

  return rows[0];
}

export async function rescheduleAppointment(
  patientUser: AuthUser,
  appointmentId: string,
  input: { scheduled_at?: string; duration_minutes?: number },
) {
  const scheduledAtIso = input.scheduled_at;
  const duration = Number(input.duration_minutes ?? 30);

  if (!scheduledAtIso) {
    throw createHttpError(400, "scheduled_at is required");
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw createHttpError(400, "duration_minutes must be a positive number");
  }

  const appointmentResult = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    status: string;
    doctor_name: string;
  }>(
    `SELECT
      a.id,
      a.patient_id,
      a.doctor_id,
      a.status,
      doctor.name AS doctor_name
     FROM appointments a
     JOIN users doctor ON doctor.id = a.doctor_id
     WHERE a.id = $1 AND a.patient_id = $2
     LIMIT 1`,
    [appointmentId, patientUser.id],
  );

  const appointment = appointmentResult.rows[0];

  if (!appointment) {
    throw createHttpError(404, "Appointment not found");
  }

  if (!['pending', 'confirmed'].includes(appointment.status)) {
    throw createHttpError(
      409,
      "Only pending or confirmed appointments can be rescheduled",
    );
  }

  await assertDoctorAvailable(
    appointment.doctor_id,
    scheduledAtIso,
    duration,
    appointment.id,
  );

  const { rows } = await pool.query(
    `UPDATE appointments
     SET
       scheduled_at = $2::timestamptz,
       duration_minutes = $3,
       status = 'pending',
       approved_at = NULL,
       rejected_at = NULL,
       rejection_reason = NULL,
       video_room_url = NULL,
       cancelled_by = NULL,
       cancelled_at = NULL,
       completed_at = NULL
     WHERE id = $1
     RETURNING id, patient_id, doctor_id, scheduled_at::text, status, duration_minutes, video_room_url`,
    [appointmentId, scheduledAtIso, duration],
  );

  const scheduledLabel = formatNotificationSchedule(rows[0].scheduled_at);

  await Promise.all([
    createNotification(
      appointment.doctor_id,
      "appointment_rescheduled",
      `An appointment from ${patientUser.name} was rescheduled to ${scheduledLabel} and needs your confirmation.`,
    ),
    createNotification(
      patientUser.id,
      "appointment_rescheduled",
      `Your appointment with Dr. ${appointment.doctor_name} was rescheduled to ${scheduledLabel} and is awaiting confirmation.`,
    ),
  ]);

  return rows[0];
}

export async function completeAppointment(
  doctorUser: AuthUser,
  appointmentId: string,
) {
  await autoCompleteStaleConfirmedAppointments();

  const appointmentResult = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    patient_name: string;
  }>(
    `SELECT a.id, a.patient_id, a.doctor_id, a.scheduled_at::text, a.duration_minutes, a.status, p.name AS patient_name
     FROM appointments a
     JOIN users p ON p.id = a.patient_id
     WHERE a.id = $1 AND a.doctor_id = $2
     LIMIT 1`,
    [appointmentId, doctorUser.id],
  );

  const appointment = appointmentResult.rows[0];

  if (!appointment) {
    throw createHttpError(404, "Appointment not found");
  }

  if (appointment.status !== "confirmed") {
    throw createHttpError(
      409,
      "Only confirmed appointments can be marked completed",
    );
  }

  const endsAt = new Date(
    new Date(appointment.scheduled_at).getTime() +
      appointment.duration_minutes * 60 * 1000,
  );

  if (new Date() < endsAt) {
    throw createHttpError(
      409,
      "Appointment can only be completed after scheduled time passes",
    );
  }

  const scheduledLabel = formatNotificationSchedule(appointment.scheduled_at);

  const { rows } = await pool.query(
    `UPDATE appointments
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1
     RETURNING id, patient_id, doctor_id, status, completed_at::text`,
    [appointmentId],
  );

  await Promise.all([
    createNotification(
      appointment.patient_id,
      "appointment_completed",
      `Dr. ${doctorUser.name} marked your appointment scheduled for ${scheduledLabel} as completed.`,
    ),
    createNotification(
      doctorUser.id,
      "appointment_completed",
      `You completed an appointment with ${appointment.patient_name} scheduled for ${scheduledLabel}.`,
    ),
  ]);

  return rows[0];
}

export async function createConsultationNote(
  doctorUser: AuthUser,
  appointmentId: string,
  input: { subjective?: string; diagnosis?: string; prescription?: string },
) {
  const apptResult = await pool.query<{
    id: string;
    patient_id: string;
    status: string;
    scheduled_at: string;
  }>(
    `SELECT id, patient_id, status, scheduled_at::text
     FROM appointments
     WHERE id = $1 AND doctor_id = $2
     LIMIT 1`,
    [appointmentId, doctorUser.id],
  );

  const appointment = apptResult.rows[0];

  if (!appointment) {
    throw createHttpError(404, "Appointment not found");
  }

  if (appointment.status !== "completed") {
    throw createHttpError(
      409,
      "Consultation notes can only be added to completed appointments",
    );
  }

  const scheduledLabel = formatNotificationSchedule(appointment.scheduled_at);

  const { rows } = await pool.query(
    `INSERT INTO consultation_notes (
      appointment_id,
      doctor_id,
      patient_id,
      subjective,
      diagnosis,
      prescription
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, appointment_id, doctor_id, patient_id, subjective, diagnosis, prescription, created_at::text`,
    [
      appointmentId,
      doctorUser.id,
      appointment.patient_id,
      input.subjective ?? null,
      input.diagnosis ?? null,
      input.prescription ?? null,
    ],
  );

  await createNotification(
    appointment.patient_id,
    "consultation_note_created",
    `A consultation note has been added for your appointment scheduled for ${scheduledLabel}.`,
  );

  return rows[0];
}

export async function getAppointmentNotes(
  user: AuthUser,
  appointmentId: string,
) {
  const apptResult = await pool.query<{ id: string }>(
    `SELECT id
     FROM appointments
     WHERE id = $1
       AND (doctor_id = $2 OR patient_id = $2)
     LIMIT 1`,
    [appointmentId, user.id],
  );

  if (!apptResult.rows[0]) {
    throw createHttpError(
      403,
      "You do not have access to this appointment notes",
    );
  }

  const { rows } = await pool.query(
    `SELECT id, appointment_id, doctor_id, patient_id, subjective, diagnosis, prescription, created_at::text
     FROM consultation_notes
     WHERE appointment_id = $1
     ORDER BY created_at DESC`,
    [appointmentId],
  );

  return rows;
}

export async function updateConsultationNote(
  doctorUser: AuthUser,
  appointmentId: string,
  noteId: string,
  input: { subjective?: string; diagnosis?: string; prescription?: string },
) {
  const { rows } = await pool.query(
    `UPDATE consultation_notes
     SET
       subjective = COALESCE($4, subjective),
       diagnosis = COALESCE($5, diagnosis),
       prescription = COALESCE($6, prescription)
     WHERE id = $1
       AND appointment_id = $2
       AND doctor_id = $3
     RETURNING id, appointment_id, doctor_id, patient_id, subjective, diagnosis, prescription, created_at::text`,
    [
      noteId,
      appointmentId,
      doctorUser.id,
      input.subjective ?? null,
      input.diagnosis ?? null,
      input.prescription ?? null,
    ],
  );

  if (!rows[0]) {
    throw createHttpError(404, "Consultation note not found");
  }

  return rows[0];
}

export async function deleteConsultationNote(
  doctorUser: AuthUser,
  appointmentId: string,
  noteId: string,
) {
  const { rows } = await pool.query(
    `DELETE FROM consultation_notes
     WHERE id = $1 AND appointment_id = $2 AND doctor_id = $3
     RETURNING id`,
    [noteId, appointmentId, doctorUser.id],
  );

  if (!rows[0]) {
    throw createHttpError(404, "Consultation note not found");
  }
}

export async function listOwnMedicalRecords(patientId: string) {
  const { rows } = await pool.query(
    `SELECT
      n.id,
      n.appointment_id,
      n.subjective,
      n.diagnosis,
      n.prescription,
      n.created_at::text,
      a.scheduled_at::text,
      doctor.name AS doctor_name,
      dp.specialization
     FROM consultation_notes n
     JOIN appointments a ON a.id = n.appointment_id
     JOIN users doctor ON doctor.id = n.doctor_id
     LEFT JOIN doctor_profiles dp ON dp.user_id = n.doctor_id
     WHERE n.patient_id = $1
     ORDER BY n.created_at DESC`,
    [patientId],
  );

  return rows;
}
