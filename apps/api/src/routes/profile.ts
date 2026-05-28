import { Router } from "express";

import {
  getMyProfileHandler,
  patchMyProfileHandler,
} from "../controllers/profile";
import { auth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/me", auth, asyncHandler(getMyProfileHandler));
router.patch("/me", auth, asyncHandler(patchMyProfileHandler));

export default router;
