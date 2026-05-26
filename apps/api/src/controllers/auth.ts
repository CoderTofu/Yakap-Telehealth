import type { Request, Response } from "express";

import { issueAuthToken } from "../middleware/auth";
import {
  verifyLoginPassword,
  findUserByEmail,
  registerUser,
} from "../services/auth";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email) {
    return res.status(400).json({ error: { message: "Email is required" } });
  }

  if (!password) {
    return res.status(400).json({ error: { message: "Password is required" } });
  }

  const user = await verifyLoginPassword(email, password);

  if (!user) {
    return res.status(401).json({ error: { message: "Invalid credentials" } });
  }

  const token = issueAuthToken(user);

  return res.json({
    data: {
      token,
      user,
    },
  });
}

export function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  return res.json({ data: req.user });
}

export async function register(req: Request, res: Response) {
  const {
    email,
    password,
    role,
    name,
    phone,
    avatar_url,
    patient_profile,
    doctor_profile,
  } = req.body as {
    email?: string;
    password?: string;
    role?: "patient" | "doctor";
    name?: string;
    phone?: string;
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

  if (!email) {
    return res.status(400).json({ error: { message: "Email is required" } });
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return res.status(409).json({ error: { message: "Email already exists" } });
  }

  if (role !== "patient" && role !== "doctor") {
    return res
      .status(400)
      .json({ error: { message: "Role must be patient or doctor" } });
  }

  if (!password) {
    return res.status(400).json({ error: { message: "Password is required" } });
  }

  if (!name) {
    return res.status(400).json({ error: { message: "Name is required" } });
  }

  if (!phone) {
    return res.status(400).json({ error: { message: "Phone is required" } });
  }

  if (role === "doctor") {
    const { specialization, license_number } = doctor_profile ?? {};

    if (!specialization) {
      return res
        .status(400)
        .json({ error: { message: "Specialization is required" } });
    }

    if (!license_number) {
      return res
        .status(400)
        .json({ error: { message: "License number is required" } });
    }
  }

  const user = await registerUser({
    email,
    password,
    role,
    name,
    phone,
    avatar_url,
    patient_profile,
    doctor_profile,
  });

  const token = issueAuthToken(user);

  return res.status(201).json({
    data: {
      token,
      user,
    },
  });
}
