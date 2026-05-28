import { Router } from "express";
import { getDoctorSpecialization } from "../controllers/gemini";

const router = Router();

router.post("/", getDoctorSpecialization);

export default router