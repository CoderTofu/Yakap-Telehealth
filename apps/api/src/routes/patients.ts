import { Router } from "express";

import { getMyMedicalRecordsHandler } from "../controllers/patients";
import { auth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/me/records", auth, asyncHandler(getMyMedicalRecordsHandler));

export default router;
