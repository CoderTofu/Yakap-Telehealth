import type { NextFunction, Request, Response } from "express";

import {
  cancelAppointment,
  completeAppointment,
  createAppointment,
  createConsultationNote,
  decideAppointment,
  deleteConsultationNote,
  getAppointmentNotes,
  listOwnAppointments,
  updateConsultationNote,
} from "../services/appointments";

function ensureUser(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: { message: "Unauthorized" } });
    return false;
  }

  return true;
}

export async function createAppointmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  if (req.user!.role !== "patient") {
    return res
      .status(403)
      .json({ error: { message: "Only patients can create appointments" } });
  }

  try {
    const data = await createAppointment(req.user!.id, req.body ?? {});
    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function listMyAppointmentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  try {
    const data = await listOwnAppointments({
      id: req.user!.id,
      role: req.user!.role,
      name: req.user!.name,
    });
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function decideAppointmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  if (req.user!.role !== "doctor") {
    return res
      .status(403)
      .json({
        error: { message: "Only doctors can approve or reject appointments" },
      });
  }

  const action = req.body?.action;

  if (action !== "approve" && action !== "reject") {
    return res
      .status(400)
      .json({ error: { message: "action must be approve or reject" } });
  }

  try {
    const data = await decideAppointment(
      { id: req.user!.id, role: req.user!.role, name: req.user!.name },
      req.params.id,
      action,
      typeof req.body?.reason === "string" ? req.body.reason : undefined,
    );

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function cancelAppointmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  try {
    const data = await cancelAppointment(
      { id: req.user!.id, role: req.user!.role, name: req.user!.name },
      req.params.id,
      typeof req.body?.reason === "string" ? req.body.reason : undefined,
    );

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function completeAppointmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  if (req.user!.role !== "doctor") {
    return res
      .status(403)
      .json({ error: { message: "Only doctors can complete appointments" } });
  }

  try {
    const data = await completeAppointment(
      { id: req.user!.id, role: req.user!.role, name: req.user!.name },
      req.params.id,
    );

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function createAppointmentNoteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  if (req.user!.role !== "doctor") {
    return res
      .status(403)
      .json({
        error: { message: "Only doctors can create consultation notes" },
      });
  }

  try {
    const data = await createConsultationNote(
      { id: req.user!.id, role: req.user!.role, name: req.user!.name },
      req.params.id,
      {
        subjective:
          typeof req.body?.subjective === "string"
            ? req.body.subjective
            : undefined,
        diagnosis:
          typeof req.body?.diagnosis === "string"
            ? req.body.diagnosis
            : undefined,
        prescription:
          typeof req.body?.prescription === "string"
            ? req.body.prescription
            : undefined,
      },
    );

    return res.status(201).json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function getAppointmentNotesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  try {
    const data = await getAppointmentNotes(
      { id: req.user!.id, role: req.user!.role, name: req.user!.name },
      req.params.id,
    );

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function updateAppointmentNoteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  if (req.user!.role !== "doctor") {
    return res
      .status(403)
      .json({
        error: { message: "Only doctors can update consultation notes" },
      });
  }

  try {
    const data = await updateConsultationNote(
      { id: req.user!.id, role: req.user!.role, name: req.user!.name },
      req.params.id,
      req.params.noteId,
      {
        subjective:
          typeof req.body?.subjective === "string"
            ? req.body.subjective
            : undefined,
        diagnosis:
          typeof req.body?.diagnosis === "string"
            ? req.body.diagnosis
            : undefined,
        prescription:
          typeof req.body?.prescription === "string"
            ? req.body.prescription
            : undefined,
      },
    );

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAppointmentNoteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!ensureUser(req, res)) return;

  if (req.user!.role !== "doctor") {
    return res
      .status(403)
      .json({
        error: { message: "Only doctors can delete consultation notes" },
      });
  }

  try {
    await deleteConsultationNote(
      { id: req.user!.id, role: req.user!.role, name: req.user!.name },
      req.params.id,
      req.params.noteId,
    );

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
