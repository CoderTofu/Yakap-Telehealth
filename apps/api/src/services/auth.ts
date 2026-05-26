import { compare } from "bcryptjs";

import pool from "../db/pool";

export type AuthUserRecord = {
  id: string;
  email: string;
  name: string;
  role: "patient" | "doctor";
  password_hash: string;
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
