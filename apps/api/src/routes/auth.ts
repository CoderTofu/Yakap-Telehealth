import { Router } from "express";

import { auth } from "../middleware/auth";
import { login, me } from "../controllers/auth";

const router = Router();

router.post("/login", login);
router.get("/me", auth, me);

export default router;
