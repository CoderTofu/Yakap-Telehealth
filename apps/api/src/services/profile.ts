import pool from "../db/pool";
import { SPECIALTY_VALUES } from "../constants";

type Role = "patient" | "doctor";

type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  patient_profile?: {
    date_of_birth?: string | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    medical_history?: string | null;
  };
  doctor_profile?: {
    specialization?: string | null;
    license_number?: string | null;
    bio?: string | null;
    years_exp?: number | null;
    consultation_fee?: number | null;
  };
};

type HttpError = Error & { statusCode?: number };

function createHttpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

export async function getOwnProfile(userId: string, role: Role) {
  const baseResult = await pool.query(
    `SELECT id, email, role, name, phone, avatar_url, created_at::text
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  const user = baseResult.rows[0];

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  if (role === "patient") {
    const profileResult = await pool.query(
      `SELECT date_of_birth, weight_kg, height_cm, medical_history
       FROM patient_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );

    return {
      ...user,
      patient_profile: profileResult.rows[0] ?? null,
    };
  }

  const profileResult = await pool.query(
    `SELECT specialization, license_number, bio, years_exp, consultation_fee::text
     FROM doctor_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );

  return {
    ...user,
    doctor_profile: profileResult.rows[0] ?? null,
  };
}

export async function updateOwnProfile(
  userId: string,
  role: Role,
  input: UpdateProfileInput,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET
         name = COALESCE($2, name),
         phone = COALESCE($3, phone),
         avatar_url = COALESCE($4, avatar_url)
       WHERE id = $1`,
      [
        userId,
        input.name ?? null,
        input.phone === undefined ? null : input.phone,
        input.avatar_url === undefined ? null : input.avatar_url,
      ],
    );

    if (role === "patient" && input.patient_profile) {
      await client.query(
        `INSERT INTO patient_profiles (
          user_id,
          date_of_birth,
          weight_kg,
          height_cm,
          medical_history
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id)
        DO UPDATE SET
          date_of_birth = COALESCE(EXCLUDED.date_of_birth, patient_profiles.date_of_birth),
          weight_kg = COALESCE(EXCLUDED.weight_kg, patient_profiles.weight_kg),
          height_cm = COALESCE(EXCLUDED.height_cm, patient_profiles.height_cm),
          medical_history = COALESCE(EXCLUDED.medical_history, patient_profiles.medical_history)`,
        [
          userId,
          input.patient_profile.date_of_birth ?? null,
          input.patient_profile.weight_kg ?? null,
          input.patient_profile.height_cm ?? null,
          input.patient_profile.medical_history ?? null,
        ],
      );
    }

    if (role === "doctor" && input.doctor_profile) {
      const specialization =
        input.doctor_profile.specialization?.trim() ?? null;

      if (
        specialization &&
        !SPECIALTY_VALUES.includes(
          specialization as (typeof SPECIALTY_VALUES)[number],
        )
      ) {
        throw createHttpError(400, "Invalid specialization");
      }

      await client.query(
        `INSERT INTO doctor_profiles (
          user_id,
          specialization,
          license_number,
          bio,
          years_exp,
          consultation_fee
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id)
        DO UPDATE SET
          specialization = COALESCE(EXCLUDED.specialization, doctor_profiles.specialization),
          license_number = COALESCE(EXCLUDED.license_number, doctor_profiles.license_number),
          bio = COALESCE(EXCLUDED.bio, doctor_profiles.bio),
          years_exp = COALESCE(EXCLUDED.years_exp, doctor_profiles.years_exp),
          consultation_fee = COALESCE(EXCLUDED.consultation_fee, doctor_profiles.consultation_fee)`,
        [
          userId,
          specialization,
          input.doctor_profile.license_number ?? null,
          input.doctor_profile.bio ?? null,
          input.doctor_profile.years_exp ?? null,
          input.doctor_profile.consultation_fee ?? null,
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

  return getOwnProfile(userId, role);
}
