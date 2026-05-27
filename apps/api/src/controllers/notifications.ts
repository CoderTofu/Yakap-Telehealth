import type { NextFunction, Request, Response } from "express";

import {
  listOwnNotifications,
  markNotificationRead,
} from "../services/notifications";

export async function getMyNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  try {
    const data = await listOwnNotifications(req.user.id);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function markMyNotificationReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  try {
    const data = await markNotificationRead(req.user.id, req.params.id);

    if (!data) {
      return res
        .status(404)
        .json({ error: { message: "Notification not found" } });
    }

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}
