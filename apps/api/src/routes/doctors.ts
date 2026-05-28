import { Router } from "express";

import {
  getDoctorAvailabilityHandler,
  getDoctorByIdHandler,
  getMyPatientProfileHandler,
  getMyPatientsHandler,
  getMyScheduleHandler,
  listDoctorsHandler,
  postMyBlockHandler,
  putMyScheduleHandler,
} from "../controllers/doctors";
import { auth } from "../middleware/auth";
import {
  ensureDoctorRole,
  validateBlockPayload,
  validateWeeklySchedules,
} from "../middleware/doctors";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(listDoctorsHandler));

router.get("/me/schedule", auth, ensureDoctorRole, asyncHandler(getMyScheduleHandler));
router.put(
  "/me/schedule",
  auth,
  ensureDoctorRole,
  validateWeeklySchedules,
  asyncHandler(putMyScheduleHandler),
);
router.post(
  "/me/blocks",
  auth,
  ensureDoctorRole,
  validateBlockPayload,
  asyncHandler(postMyBlockHandler),
);
router.get("/me/patients", auth, ensureDoctorRole, asyncHandler(getMyPatientsHandler));
router.get(
  "/me/patients/:patientId",
  auth,
  ensureDoctorRole,
  asyncHandler(getMyPatientProfileHandler),
);

router.get("/:id/availability", asyncHandler(getDoctorAvailabilityHandler));
router.get("/:id", asyncHandler(getDoctorByIdHandler));

export default router;
