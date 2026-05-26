import { compare, hash } from "bcryptjs";

import pool from "../db/pool";

export type AuthUserRecord = {
  id: string;
  email: string;
  name: string;
  role: "patient" | "doctor";
  password_hash: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  role: "patient" | "doctor";
  phone: string | null;
  avatar_url: string | null;
};

export type RegisterUserInput = {
  email: string;
  password: string;
  role: "patient" | "doctor";
  name: string;
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

export async function findUserByEmail(email: string) {
  const { rows } = await pool.query<AuthUserRecord>(
    `SELECT id, email, name, role, password_hash
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
}

export async function verifyLoginPassword(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const isValid = await compare(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function registerUser(input: RegisterUserInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await hash(input.password, 10);

    const userResult = await client.query<RegisteredUser>(
      `INSERT INTO users (email, password_hash, role, name, phone, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, phone, avatar_url`,
      [
        input.email,
        passwordHash,
        input.role,
        input.name,
        input.phone ?? null,
        input.avatar_url ?? null,
      ],
    );

    const user = userResult.rows[0];

    if (input.role === "patient") {
      await client.query(
        `INSERT INTO patient_profiles (
           user_id,
           date_of_birth,
           weight_kg,
           height_cm,
           medical_history
         ) VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          input.patient_profile?.date_of_birth ?? null,
          input.patient_profile?.weight_kg ?? null,
          input.patient_profile?.height_cm ?? null,
          input.patient_profile?.medical_history ?? null,
        ],
      );
    }

    if (input.role === "doctor") {
      const specialization = input.doctor_profile?.specialization;
      const licenseNumber = input.doctor_profile?.license_number;

      if (!specialization || !licenseNumber) {
        throw new Error(
          "Doctor specialization and license number are required",
        );
      }

      await client.query(
        `INSERT INTO doctor_profiles (
           user_id,
           specialization,
           license_number,
           bio,
           years_exp,
           consultation_fee
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          specialization,
          licenseNumber,
          input.doctor_profile?.bio ?? null,
          input.doctor_profile?.years_exp ?? null,
          input.doctor_profile?.consultation_fee ?? null,
        ],
      );
    }

    await client.query("COMMIT");

    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
