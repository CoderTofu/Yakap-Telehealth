import { Router } from "express";

import { getMyMedicalRecordsHandler } from "../controllers/patients";
import { auth } from "../middleware/auth";


const router = Router();

router.get("/me/records", auth, getMyMedicalRecordsHandler);

export default router;
