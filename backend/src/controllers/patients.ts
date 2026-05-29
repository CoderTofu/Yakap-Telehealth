import type { NextFunction, Request, Response } from "express";

import { listOwnMedicalRecords } from "../services/appointments";

export async function getMyMedicalRecordsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  if (req.user.role !== "patient") {
    return res
      .status(403)
      .json({ error: { message: "Only patients can view medical records" } });
  }

  try {
    const data = await listOwnMedicalRecords(req.user.id);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}
