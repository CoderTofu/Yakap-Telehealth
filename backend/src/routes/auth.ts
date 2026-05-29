import { Router } from "express";

import { auth } from "../middleware/auth";
import { login, me, register } from "../controllers/auth";

const router = Router();

router.post("/login", login);
router.post("/register", register);
// auth is used to verify the token and return 401 if invalid
router.get("/me", auth, me);

export default router;
