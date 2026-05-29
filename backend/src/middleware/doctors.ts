import type { NextFunction, Request, Response } from "express";
import pool from "../db/pool";

declare global {
  namespace Express {
    interface Request {
      doctor?: any;
    }
  }
}

function timeToMinutes(t: string) {
  const parts = t.split(":");
  if (parts.length !== 2) return NaN;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

export function ensureAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  return next();
}

export function ensureDoctorRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  if (req.user.role !== "doctor") {
    return res.status(403).json({ error: { message: "Doctor role required" } });
  }

  return next();
}

export function ensureDoctorOwn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  const targetId = String(req.params.id || "");

  if (req.user.role !== "doctor" || req.user.id !== targetId) {
    return res.status(403).json({ error: { message: "Forbidden" } });
  }

  return next();
}

export async function loadDoctor(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id = String(req.params.id || "");

  if (!id) {
    return res
      .status(400)
      .json({ error: { message: "Doctor id is required" } });
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.phone, dp.specialization, dp.license_number, dp.bio, dp.years_exp, dp.consultation_fee
			 FROM users u
			 JOIN doctor_profiles dp ON u.id = dp.user_id
			 WHERE u.id = $1`,
      [id],
    );

    if (!rows[0]) {
      return res.status(404).json({ error: { message: "Doctor not found" } });
    }

    req.doctor = rows[0];

    return next();
  } catch (err) {
    return next(err);
  }
}

export function validateWeeklySchedules(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const schedules = req.body?.schedules;

  if (!Array.isArray(schedules) || schedules.length === 0) {
    return res
      .status(400)
      .json({ error: { message: "schedules must be a non-empty array" } });
  }

  for (const s of schedules) {
    const dow = Number(s?.day_of_week);
    const start = String(s?.start_time || "");
    const end = String(s?.end_time || "");

    if (!Number.isFinite(dow) || dow < 0 || dow > 6) {
      return res.status(400).json({
        error: { message: "day_of_week must be an integer between 0 and 6" },
      });
    }

    if (!/^[0-2]\d:[0-5]\d$/.test(start) || !/^[0-2]\d:[0-5]\d$/.test(end)) {
      return res
        .status(400)
        .json({ error: { message: "start_time and end_time must be HH:MM" } });
    }

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    if (
      !Number.isFinite(startMin) ||
      !Number.isFinite(endMin) ||
      endMin <= startMin
    ) {
      return res
        .status(400)
        .json({ error: { message: "end_time must be after start_time" } });
    }
  }

  return next();
}

export function validateBlockPayload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  function parseScheduledAtAsManila(iso: string) {
    if (typeof iso !== "string") return new Date(NaN);
    if (/[zZ]$/.test(iso) || /[+\-]\d{2}:\d{2}$/.test(iso)) return new Date(iso);
    return new Date(iso + "+08:00");
  }
  const startsAt = req.body?.starts_at;
  const endsAt = req.body?.ends_at;

  if (startsAt && endsAt) {
    const startDate = parseScheduledAtAsManila(String(startsAt));
    const endDate = parseScheduledAtAsManila(String(endsAt));

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({
        error: {
          message:
            "starts_at and ends_at must be valid ISO datetimes and ends_at must be after starts_at",
        },
      });
    }

    return next();
  }

  // Backward-compatible fallback: date + HH:MM inputs
  const { date, day_of_week } = req.body || {};
  const start = String(req.body?.start_time || "");
  const end = String(req.body?.end_time || "");

  if (!date && (typeof day_of_week !== "number" || Number.isNaN(day_of_week))) {
    return res
      .status(400)
      .json({
        error: {
          message: "Either starts_at/ends_at or date/day_of_week is required",
        },
      });
  }

  if (date && Number.isNaN(Date.parse(String(date)))) {
    return res
      .status(400)
      .json({ error: { message: "date must be a valid ISO date" } });
  }

  if (!/^[0-2]\d:[0-5]\d$/.test(start) || !/^[0-2]\d:[0-5]\d$/.test(end)) {
    return res
      .status(400)
      .json({ error: { message: "start_time and end_time must be HH:MM" } });
  }

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (
    !Number.isFinite(startMin) ||
    !Number.isFinite(endMin) ||
    endMin <= startMin
  ) {
    return res
      .status(400)
      .json({ error: { message: "end_time must be after start_time" } });
  }

  return next();
}

export default {
  ensureAuthenticated,
  ensureDoctorRole,
  ensureDoctorOwn,
  loadDoctor,
  validateWeeklySchedules,
  validateBlockPayload,
};
