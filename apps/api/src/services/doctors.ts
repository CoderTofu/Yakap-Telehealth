import pool from "../db/pool";

export type DoctorSummary = {
  id: string;
  name: string;
  avatar_url: string | null;
  specialization: string;
  bio: string | null;
  years_exp: number | null;
  consultation_fee: string | null;
  schedule_days: number[];
};

export type ListDoctorFilters = {
  specialization?: string;
  search?: string;
  day_of_week?: number;
  page: number;
  limit: number;
};

export type WeeklyScheduleInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
};

type HttpError = Error & { statusCode?: number };

function createHttpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function toManilaTimestamp(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  // Compute Manila-local date parts from the provided date
  const manilaDate = new Date(date.getTime() + MANILA_OFFSET_MS);
  const y = manilaDate.getUTCFullYear();
  const mo = manilaDate.getUTCMonth();
  const d = manilaDate.getUTCDate();

  // Create UTC milliseconds for the Manila-local datetime, then subtract offset
  // to get the correct UTC instant for that Manila-local time.
  const utcMsForManilaLocal = Date.UTC(y, mo, d, h, m, 0, 0) - MANILA_OFFSET_MS;
  return new Date(utcMsForManilaLocal);
}

function parseScheduledAtAsManila(iso: string) {
  if (typeof iso !== "string") return new Date(NaN);
  if (/[zZ]$/.test(iso) || /[+\-]\d{2}:\d{2}$/.test(iso)) return new Date(iso);
  return new Date(iso + "+08:00");
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export async function listDoctors(filters: ListDoctorFilters) {
  const conditions: string[] = ["u.role = 'doctor'"];
  const values: Array<string | number> = [];

  if (filters.specialization) {
    values.push(filters.specialization);
    conditions.push(`dp.specialization = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(
      `(u.name ILIKE $${values.length} OR dp.specialization ILIKE $${values.length})`,
    );
  }

  if (typeof filters.day_of_week === "number" && Number.isInteger(filters.day_of_week)) {
    values.push(filters.day_of_week);
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM doctor_schedules ds
        WHERE ds.doctor_id = u.id
          AND ds.is_blocked = FALSE
          AND ds.day_of_week = $${values.length}
      )`,
    );
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
		 FROM users u
		 JOIN doctor_profiles dp ON dp.user_id = u.id
		 ${whereClause}`,
    values,
  );

  const total = Number(countResult.rows[0]?.total ?? "0");

  const offset = (filters.page - 1) * filters.limit;
  const listValues = [...values, filters.limit, offset];

  const { rows } = await pool.query<DoctorSummary>(
    `SELECT
			u.id,
			u.name,
			u.avatar_url,
			dp.specialization,
			dp.bio,
			dp.years_exp,
    dp.consultation_fee::text,
    COALESCE(
      ARRAY(
        SELECT DISTINCT ds.day_of_week
        FROM doctor_schedules ds
        WHERE ds.doctor_id = u.id AND ds.is_blocked = FALSE
        ORDER BY ds.day_of_week
      ),
      '{}'::smallint[]
    )::int[] AS schedule_days
		 FROM users u
		 JOIN doctor_profiles dp ON dp.user_id = u.id
		 ${whereClause}
		 ORDER BY u.name ASC
		 LIMIT $${values.length + 1}
		 OFFSET $${values.length + 2}`,
    listValues,
  );

  return {
    items: rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getDoctorById(doctorId: string) {
  const { rows } = await pool.query(
    `SELECT
			u.id,
			u.email,
			u.name,
			u.phone,
			u.avatar_url,
			dp.specialization,
			dp.license_number,
			dp.bio,
			dp.years_exp,
			dp.consultation_fee::text
		 FROM users u
		 JOIN doctor_profiles dp ON dp.user_id = u.id
		 WHERE u.id = $1
		 LIMIT 1`,
    [doctorId],
  );

  return rows[0] ?? null;
}

export async function getDoctorAvailability(
  doctorId: string,
  fromIso?: string,
  toIso?: string,
) {
  const now = new Date();
  const rangeStart = fromIso ? parseScheduledAtAsManila(fromIso) : now;
  const rangeEnd = toIso
    ? parseScheduledAtAsManila(toIso)
    : new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime()) ||
    rangeEnd <= rangeStart
  ) {
    throw createHttpError(400, "Invalid availability date range");
  }

  const scheduleResult = await pool.query<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>(
    `SELECT day_of_week, start_time::text, end_time::text
		 FROM doctor_schedules
		 WHERE doctor_id = $1 AND is_blocked = FALSE`,
    [doctorId],
  );

  const blockResult = await pool.query<{ starts_at: string; ends_at: string }>(
    `SELECT starts_at::text, ends_at::text
		 FROM doctor_schedule_blocks
		 WHERE doctor_id = $1
			 AND starts_at < $3::timestamptz
			 AND ends_at > $2::timestamptz`,
    [doctorId, rangeStart.toISOString(), rangeEnd.toISOString()],
  );

  const appointmentResult = await pool.query<{
    scheduled_at: string;
    duration_minutes: number;
  }>(
    `SELECT scheduled_at::text, duration_minutes
		 FROM appointments
		 WHERE doctor_id = $1
			 AND status IN ('pending', 'confirmed')
			 AND scheduled_at >= $2::timestamptz
			 AND scheduled_at < $3::timestamptz`,
    [doctorId, rangeStart.toISOString(), rangeEnd.toISOString()],
  );

  const slots: AvailabilitySlot[] = [];
  const slotMinutes = 30;

  for (
    let cursor = new Date(rangeStart.toISOString());
    cursor < rangeEnd;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const manilaCursor = new Date(cursor.getTime() + MANILA_OFFSET_MS);
    const daySchedules = scheduleResult.rows.filter(
      (row) => row.day_of_week === manilaCursor.getUTCDay(),
    );

    for (const schedule of daySchedules) {
      const scheduleStart = toManilaTimestamp(
        cursor,
        schedule.start_time.slice(0, 5),
      );
      const scheduleEnd = toManilaTimestamp(cursor, schedule.end_time.slice(0, 5));

      for (
        let slotStart = new Date(scheduleStart.getTime());
        slotStart < scheduleEnd;
        slotStart = new Date(slotStart.getTime() + slotMinutes * 60 * 1000)
      ) {
        const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60 * 1000);

        if (
          slotEnd > scheduleEnd ||
          slotStart < rangeStart ||
          slotStart >= rangeEnd
        ) {
          continue;
        }

        const intersectsBlock = blockResult.rows.some((block) =>
          overlaps(
            slotStart,
            slotEnd,
            new Date(block.starts_at),
            new Date(block.ends_at),
          ),
        );

        if (intersectsBlock) {
          continue;
        }

        const intersectsAppointment = appointmentResult.rows.some(
          (appointment) => {
            const apptStart = new Date(appointment.scheduled_at);
            const apptEnd = new Date(
              apptStart.getTime() + appointment.duration_minutes * 60 * 1000,
            );
            return overlaps(slotStart, slotEnd, apptStart, apptEnd);
          },
        );

        if (!intersectsAppointment) {
          slots.push({
            starts_at: slotStart.toISOString(),
            ends_at: slotEnd.toISOString(),
          });
        }
      }
    }
  }

  return {
    doctor_id: doctorId,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
    slots,
  };
}

export async function getDoctorOwnSchedule(doctorId: string) {
  const [weeklyResult, blocksResult] = await Promise.all([
    pool.query<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_blocked: boolean;
    }>(
      `SELECT day_of_week, start_time::text, end_time::text, is_blocked
			 FROM doctor_schedules
			 WHERE doctor_id = $1
			 ORDER BY day_of_week ASC, start_time ASC`,
      [doctorId],
    ),
    pool.query<{
      id: string;
      starts_at: string;
      ends_at: string;
      reason: string | null;
    }>(
      `SELECT id, starts_at::text, ends_at::text, reason
			 FROM doctor_schedule_blocks
			 WHERE doctor_id = $1
			 ORDER BY starts_at ASC`,
      [doctorId],
    ),
  ]);

  return {
    weekly: weeklyResult.rows,
    blocks: blocksResult.rows,
  };
}

export async function replaceDoctorWeeklySchedule(
  doctorId: string,
  schedules: WeeklyScheduleInput[],
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM doctor_schedules WHERE doctor_id = $1`, [
      doctorId,
    ]);

    for (const schedule of schedules) {
      await client.query(
        `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_blocked)
				 VALUES ($1, $2, $3::time, $4::time, FALSE)`,
        [
          doctorId,
          schedule.day_of_week,
          schedule.start_time,
          schedule.end_time,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getDoctorOwnSchedule(doctorId);
}

export async function createDoctorBlock(
  doctorId: string,
  input: { starts_at: string; ends_at: string; reason?: string },
) {
  const start = parseScheduledAtAsManila(input.starts_at);
  const end = parseScheduledAtAsManila(input.ends_at);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    throw createHttpError(400, "Invalid block time range");
  }

  const conflictResult = await pool.query<{ id: string }>(
    `SELECT id
		 FROM appointments
		 WHERE doctor_id = $1
			 AND status IN ('pending', 'confirmed')
			 AND scheduled_at < $3::timestamptz
			 AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $2::timestamptz
		 LIMIT 1`,
    [doctorId, start.toISOString(), end.toISOString()],
  );

  if (conflictResult.rows[0]) {
    throw createHttpError(409, "Cannot block a range with active appointments");
  }

  const { rows } = await pool.query(
    `INSERT INTO doctor_schedule_blocks (doctor_id, starts_at, ends_at, reason)
		 VALUES ($1, $2::timestamptz, $3::timestamptz, $4)
		 RETURNING id, doctor_id, starts_at::text, ends_at::text, reason, created_at::text`,
    [doctorId, start.toISOString(), end.toISOString(), input.reason ?? null],
  );

  return rows[0];
}

export async function listDoctorPatients(doctorId: string) {
  const { rows } = await pool.query(
    `SELECT DISTINCT
			u.id,
			u.name,
			u.email,
			u.phone,
			u.avatar_url,
			pp.date_of_birth,
			pp.weight_kg,
			pp.height_cm
		 FROM appointments a
		 JOIN users u ON u.id = a.patient_id
		 LEFT JOIN patient_profiles pp ON pp.user_id = u.id
		 WHERE a.doctor_id = $1
			 AND a.status IN ('confirmed', 'completed')
		 ORDER BY u.name ASC`,
    [doctorId],
  );

  return rows;
}

export async function getDoctorPatientProfile(
  doctorId: string,
  patientId: string,
) {
  const relationship = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
			SELECT 1
			FROM appointments a
			WHERE a.doctor_id = $1
				AND a.patient_id = $2
				AND a.status IN ('confirmed', 'completed')
		) AS exists`,
    [doctorId, patientId],
  );

  if (!relationship.rows[0]?.exists) {
    throw createHttpError(
      403,
      "You do not have access to this patient profile",
    );
  }

  const profileResult = await pool.query(
    `SELECT
			u.id,
			u.name,
			u.email,
			u.phone,
			u.avatar_url,
			pp.date_of_birth,
			pp.weight_kg,
			pp.height_cm,
			pp.medical_history
		 FROM users u
		 LEFT JOIN patient_profiles pp ON pp.user_id = u.id
		 WHERE u.id = $1 AND u.role = 'patient'
		 LIMIT 1`,
    [patientId],
  );

  if (!profileResult.rows[0]) {
    throw createHttpError(404, "Patient not found");
  }

  return profileResult.rows[0];
}
