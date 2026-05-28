import { Router } from "express";

import { auth } from "../middleware/auth";
import { login, me, register } from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/register", asyncHandler(register));
router.get("/me", auth, asyncHandler(me));

export default router;
