import { Router } from "express";

import {
  cancelAppointmentHandler,
  completeAppointmentHandler,
  createAppointmentHandler,
  createAppointmentNoteHandler,
  decideAppointmentHandler,
  deleteAppointmentNoteHandler,
  getAppointmentMeetingLinkHandler,
  getAppointmentNotesHandler,
  listMyAppointmentsHandler,
  rateAppointmentHandler,
  rescheduleAppointmentHandler,
  updateAppointmentNoteHandler,
} from "../controllers/appointments";
import { auth } from "../middleware/auth";


const router = Router();

router.post("/", auth, createAppointmentHandler);
router.get("/me", auth, listMyAppointmentsHandler);
router.patch("/:id/decision", auth, decideAppointmentHandler);
router.patch("/:id/reschedule", auth, rescheduleAppointmentHandler);
router.patch("/:id/cancel", auth, cancelAppointmentHandler);
router.patch("/:id/complete", auth, completeAppointmentHandler);
router.patch("/:id/rate", auth, rateAppointmentHandler);
router.get("/:id/meeting", auth, getAppointmentMeetingLinkHandler);

router.post("/:id/notes", auth, createAppointmentNoteHandler);
router.get("/:id/notes", auth, getAppointmentNotesHandler);
router.patch("/:id/notes/:noteId", auth, updateAppointmentNoteHandler);
router.delete("/:id/notes/:noteId", auth, deleteAppointmentNoteHandler);

export default router;
