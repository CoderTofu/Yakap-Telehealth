import pool from "../db/pool";
import { createNotification } from "./notifications";

type Role = "patient" | "doctor";

type AuthUser = {
  id: string;
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

function formatGoogleDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function buildGoogleCalendarLink(input: {
  startsAt: Date;
  durationMinutes: number;
  doctorName: string;
  patientName: string;
  appointmentId: string;
}) {
  const end = new Date(
    input.startsAt.getTime() + input.durationMinutes * 60 * 1000,
  );

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Telehealth Consultation",
    details: `Appointment ${input.appointmentId} with Dr. ${input.doctorName} and ${input.patientName}`,
    dates: `${formatGoogleDate(input.startsAt)}/${formatGoogleDate(end)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function assertDoctorAvailable(
  doctorId: string,
  scheduledAtIso: string,
  durationMinutes: number,
) {
  const scheduledAt = new Date(scheduledAtIso);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw createHttpError(400, "Invalid scheduled_at");
  }

  const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
  const dayOfWeek = scheduledAt.getUTCDay();
  const hh = String(scheduledAt.getUTCHours()).padStart(2, "0");
  const mm = String(scheduledAt.getUTCMinutes()).padStart(2, "0");
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

  const conflictResult = await pool.query<{
    scheduled_at: string;
    duration_minutes: number;
  }>(
    `SELECT scheduled_at::text, duration_minutes
     FROM appointments
     WHERE doctor_id = $1
       AND status IN ('pending', 'confirmed')
       AND scheduled_at < $3::timestamptz
       AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $2::timestamptz`,
    [doctorId, scheduledAt.toISOString(), endAt.toISOString()],
  );

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
  patientId: string,
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

  await assertDoctorAvailable(doctorId, scheduledAt, duration);

  const patientResult = await pool.query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1 LIMIT 1`,
    [patientId],
  );
  const patientName = patientResult.rows[0]?.name ?? "Patient";

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

  await Promise.all([
    createNotification(
      doctorId,
      "appointment_pending",
      `New appointment request from ${patientName}.`,
    ),
    createNotification(
      patientId,
      "appointment_pending",
      `Appointment request sent to Dr. ${doctor.name}.`,
    ),
  ]);

  return rows[0];
}

export async function listOwnAppointments(user: AuthUser) {
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

export async function decideAppointment(
  doctorUser: AuthUser,
  appointmentId: string,
  action: "approve" | "reject",
  reason?: string,
) {
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

  if (action === "approve") {
    const calendarLink = buildGoogleCalendarLink({
      startsAt: new Date(appointment.scheduled_at),
      durationMinutes: appointment.duration_minutes,
      doctorName: doctorUser.name,
      patientName: appointment.patient_name,
      appointmentId: appointment.id,
    });

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
      [appointmentId, calendarLink],
    );

    await Promise.all([
      createNotification(
        appointment.patient_id,
        "appointment_confirmed",
        `Dr. ${doctorUser.name} approved your appointment.`,
      ),
      createNotification(
        doctorUser.id,
        "appointment_confirmed",
        `You approved appointment ${appointment.id}.`,
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
      `Dr. ${doctorUser.name} rejected your appointment request.`,
    ),
    createNotification(
      doctorUser.id,
      "appointment_rejected",
      `You rejected appointment ${appointment.id}.`,
    ),
  ]);

  return rows[0];
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
  }>(
    `SELECT id, patient_id, doctor_id, status
     FROM appointments
     WHERE id = $1
       AND (patient_id = $2 OR doctor_id = $2)
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

  await Promise.all([
    createNotification(
      counterpartId,
      "appointment_cancelled",
      `${user.name} cancelled appointment ${appointment.id}.`,
    ),
    createNotification(
      user.id,
      "appointment_cancelled",
      `You cancelled appointment ${appointment.id}.`,
    ),
  ]);

  return rows[0];
}

export async function completeAppointment(
  doctorUser: AuthUser,
  appointmentId: string,
) {
  const appointmentResult = await pool.query<{
    id: string;
    patient_id: string;
    doctor_id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
  }>(
    `SELECT id, patient_id, doctor_id, scheduled_at::text, duration_minutes, status
     FROM appointments
     WHERE id = $1 AND doctor_id = $2
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
      `Appointment ${appointment.id} has been marked completed by Dr. ${doctorUser.name}.`,
    ),
    createNotification(
      doctorUser.id,
      "appointment_completed",
      `You completed appointment ${appointment.id}.`,
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
  }>(
    `SELECT id, patient_id, status
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
    `A consultation note has been added for appointment ${appointment.id}.`,
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
