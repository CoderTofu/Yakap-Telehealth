import { Router } from "express";

import {
  getMyNotificationsHandler,
  markMyNotificationReadHandler,
} from "../controllers/notifications";
import { auth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/me", auth, asyncHandler(getMyNotificationsHandler));
router.patch("/:id/read", auth, asyncHandler(markMyNotificationReadHandler));

export default router;
