import { Router } from "express";
import { getDoctorSpecialization } from "../controllers/gemini";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", asyncHandler(getDoctorSpecialization));

export default router