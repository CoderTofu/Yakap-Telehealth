import { compare, hash } from "bcryptjs";

import pool from "../db/pool";
import { SPECIALTY_VALUES } from "../constants";

export type FindDoctors = {
  id: string;
  name: string;
  role: "patient" | "doctor";
  specialization?: string;
  bio: string;
  years_exp: number;
  day_of_week?: number[];
};

// Find a Doctor/s
export async function findDoctors(
  role: string,
  specialization: string,
  day_of_week: number[],
) {
  const conditions: string[] = ["users.role = $1"];
  const values: any[] = [role];

  let paramIndex = 2;

  if (specialization) {
    conditions.push(`doctor_profiles.specialization = $${paramIndex}`);
    values.push(specialization);
    paramIndex++;
  }

  if (day_of_week && day_of_week.length > 0) {
    conditions.push(`doctor_schedules.day_of_week = ANY($${paramIndex})`);
    values.push(day_of_week);
    paramIndex++;
  }

  const { rows } = await pool.query<FindDoctors>(
    `SELECT 
        users.id, 
        users.name, 
        users.role, 
        doctor_profiles.specialization, 
        doctor_profiles.years_exp, 
        doctor_schedules.day_of_week
    FROM users
    JOIN doctor_profile 
        ON users.id = doctor_profiles.user_id
    JOIN doctor_schedules 
        ON users.id = doctor_schedules.doctor_id
    WHERE users.role = ${conditions.join(" AND ")}
    GROUP BY
      users.id,
      users.name,
      users.role,
      doctor_profiles.specialization,
      doctor_profiles.bio,
      doctor_profiles.years_exp
    `,
    [role, specialization, day_of_week],
  );

  return rows || null;
}
