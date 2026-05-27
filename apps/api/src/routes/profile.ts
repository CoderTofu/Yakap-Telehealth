import { Router } from "express";

import {
  getMyProfileHandler,
  patchMyProfileHandler,
} from "../controllers/profile";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/me", auth, getMyProfileHandler);
router.patch("/me", auth, patchMyProfileHandler);

export default router;
