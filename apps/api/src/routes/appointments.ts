import { Router } from "express";

import {
  cancelAppointmentHandler,
  completeAppointmentHandler,
  createAppointmentHandler,
  createAppointmentNoteHandler,
  decideAppointmentHandler,
  deleteAppointmentNoteHandler,
  getAppointmentNotesHandler,
  listMyAppointmentsHandler,
  updateAppointmentNoteHandler,
} from "../controllers/appointments";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/", auth, createAppointmentHandler);
router.get("/me", auth, listMyAppointmentsHandler);
router.patch("/:id/decision", auth, decideAppointmentHandler);
router.patch("/:id/cancel", auth, cancelAppointmentHandler);
router.patch("/:id/complete", auth, completeAppointmentHandler);

router.post("/:id/notes", auth, createAppointmentNoteHandler);
router.get("/:id/notes", auth, getAppointmentNotesHandler);
router.patch("/:id/notes/:noteId", auth, updateAppointmentNoteHandler);
router.delete("/:id/notes/:noteId", auth, deleteAppointmentNoteHandler);

export default router;
