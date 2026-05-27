import type { NextFunction, Request, Response } from "express";

import {
  createDoctorBlock,
  getDoctorAvailability,
  getDoctorById,
  getDoctorOwnSchedule,
  getDoctorPatientProfile,
  listDoctorPatients,
  listDoctors,
  replaceDoctorWeeklySchedule,
} from "../services/doctors";

export async function listDoctorsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 12)));

    const data = await listDoctors({
      specialization:
        typeof req.query.specialization === "string"
          ? req.query.specialization
          : undefined,
      search:
        typeof req.query.search === "string" ? req.query.search : undefined,
      page,
      limit,
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getDoctorByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const doctor = await getDoctorById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ error: { message: "Doctor not found" } });
    }

    return res.json({ data: doctor });
  } catch (error) {
    return next(error);
  }
}

export async function getDoctorAvailabilityHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getDoctorAvailability(
      req.params.id,
      typeof req.query.from === "string" ? req.query.from : undefined,
      typeof req.query.to === "string" ? req.query.to : undefined,
    );

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getMyScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getDoctorOwnSchedule(req.user!.id);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function putMyScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const schedules = Array.isArray(req.body?.schedules)
      ? req.body.schedules
      : [];

    const data = await replaceDoctorWeeklySchedule(req.user!.id, schedules);

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function postMyBlockHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let startsAt = req.body?.starts_at as string | undefined;
    let endsAt = req.body?.ends_at as string | undefined;

    if (
      !startsAt &&
      req.body?.date &&
      req.body?.start_time &&
      req.body?.end_time
    ) {
      startsAt = `${req.body.date}T${req.body.start_time}:00.000Z`;
      endsAt = `${req.body.date}T${req.body.end_time}:00.000Z`;
    }

    const block = await createDoctorBlock(req.user!.id, {
      starts_at: String(startsAt),
      ends_at: String(endsAt),
      reason:
        typeof req.body?.reason === "string" ? req.body.reason : undefined,
    });

    return res.status(201).json({ data: block });
  } catch (error) {
    return next(error);
  }
}

export async function getMyPatientsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await listDoctorPatients(req.user!.id);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getMyPatientProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getDoctorPatientProfile(
      req.user!.id,
      req.params.patientId,
    );
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}
