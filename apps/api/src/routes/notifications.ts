import { Router } from "express";

import {
  getMyNotificationsHandler,
  markMyNotificationReadHandler,
} from "../controllers/notifications";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/me", auth, getMyNotificationsHandler);
router.patch("/:id/read", auth, markMyNotificationReadHandler);

export default router;
