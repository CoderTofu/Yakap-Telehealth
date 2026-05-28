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


const router = Router();

router.get("/", listDoctorsHandler);

router.get("/me/schedule", auth, ensureDoctorRole, getMyScheduleHandler);
router.put(
  "/me/schedule",
  auth,
  ensureDoctorRole,
  validateWeeklySchedules,
  putMyScheduleHandler,
);
router.post(
  "/me/blocks",
  auth,
  ensureDoctorRole,
  validateBlockPayload,
  postMyBlockHandler,
);
router.get("/me/patients", auth, ensureDoctorRole, getMyPatientsHandler);
router.get(
  "/me/patients/:patientId",
  auth,
  ensureDoctorRole,
  getMyPatientProfileHandler,
);

router.get("/:id/availability", getDoctorAvailabilityHandler);
router.get("/:id", getDoctorByIdHandler);

export default router;
