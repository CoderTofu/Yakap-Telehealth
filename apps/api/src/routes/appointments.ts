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
  rescheduleAppointmentHandler,
  updateAppointmentNoteHandler,
} from "../controllers/appointments";
import { auth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", auth, asyncHandler(createAppointmentHandler));
router.get("/me", auth, asyncHandler(listMyAppointmentsHandler));
router.patch("/:id/decision", auth, asyncHandler(decideAppointmentHandler));
router.patch("/:id/reschedule", auth, asyncHandler(rescheduleAppointmentHandler));
router.patch("/:id/cancel", auth, asyncHandler(cancelAppointmentHandler));
router.patch("/:id/complete", auth, asyncHandler(completeAppointmentHandler));
router.get("/:id/meeting", auth, asyncHandler(getAppointmentMeetingLinkHandler));

router.post("/:id/notes", auth, asyncHandler(createAppointmentNoteHandler));
router.get("/:id/notes", auth, asyncHandler(getAppointmentNotesHandler));
router.patch("/:id/notes/:noteId", auth, asyncHandler(updateAppointmentNoteHandler));
router.delete("/:id/notes/:noteId", auth, asyncHandler(deleteAppointmentNoteHandler));

export default router;
