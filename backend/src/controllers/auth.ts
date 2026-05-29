import type { Request, Response } from "express";

import { issueAuthToken } from "../middleware/auth";
import {
  verifyLoginPassword,
  findUserByEmail,
  registerUser,
} from "../services/auth";
import { SPECIALTY_VALUES, USER_ROLES } from "../constants";

function isValidFullName(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 5) return false;
  const parts = cleaned.split(" ");
  if (parts.length < 2) return false;
  return parts.every((part) => /^[A-Za-z][A-Za-z.'-]{1,}$/.test(part));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  return /^\+63\s9\d{2}\s\d{3}\s\d{4}$/.test(value.trim());
}

function getPasswordValidationError(value: string) {
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(value)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(value)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include a special character";
  }
  return null;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email) {
    res.status(400).json({ error: { message: "Email is required" } });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: { message: "Email is invalid" } });
    return;
  }

  if (!password) {
    res.status(400).json({ error: { message: "Password is required" } });
    return;
  }

  const user = await verifyLoginPassword(email, password);

  if (!user) {
    res.status(401).json({ error: { message: "Invalid credentials" } });
    return;
  }

  const token = issueAuthToken(user);

  res.json({
    data: {
      token,
      user,
    },
  });
}

export function me(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: { message: "Unauthorized" } });
    return;
  }

  res.json({ data: req.user });
}

export async function register(req: Request, res: Response): Promise<void> {
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
    role?: string;
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
    res.status(400).json({ error: { message: "Email is required" } });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: { message: "Email is invalid" } });
    return;
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    res.status(409).json({ error: { message: "Email already exists" } });
    return;
  }

  const normalizedRole = role?.trim();

  if (
    !normalizedRole ||
    !USER_ROLES.includes(normalizedRole as (typeof USER_ROLES)[number])
  ) {
    res
      .status(400)
      .json({ error: { message: "Role must be patient or doctor" } });
    return;
  }

  if (!password) {
    res.status(400).json({ error: { message: "Password is required" } });
    return;
  }

  const passwordError = getPasswordValidationError(password);

  if (passwordError) {
    res.status(400).json({ error: { message: passwordError } });
    return;
  }

  if (!name) {
    res.status(400).json({ error: { message: "Name is required" } });
    return;
  }

  if (!isValidFullName(name)) {
    res.status(400).json({ error: { message: "Please provide a valid full name" } });
    return;
  }

  if (!phone) {
    res.status(400).json({ error: { message: "Phone is required" } });
    return;
  }

  if (!isValidPhone(phone)) {
    res.status(400).json({ error: { message: "Phone must follow +63 9xx xxx xxxx" } });
    return;
  }

  if (normalizedRole === "doctor") {
    const { specialization, license_number } = doctor_profile ?? {};
    const normalizedSpecialization = specialization?.trim();

    if (
      !normalizedSpecialization ||
      !SPECIALTY_VALUES.includes(
        normalizedSpecialization as (typeof SPECIALTY_VALUES)[number],
      )
    ) {
      res
        .status(400)
        .json({ error: { message: "Specialization must be one of the allowed options" } });
      return;
    }

    if (!license_number) {
      res
        .status(400)
        .json({ error: { message: "License number is required" } });
      return;
    }
  }

  const user = await registerUser({
    email,
    password,
    role: normalizedRole as "patient" | "doctor",
    name,
    phone,
    avatar_url,
    patient_profile,
    doctor_profile,
  });

  const token = issueAuthToken(user);

  res.status(201).json({
    data: {
      token,
      user,
    },
  });
}
