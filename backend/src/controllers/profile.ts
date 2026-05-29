import type { NextFunction, Request, Response } from "express";

import { getOwnProfile, updateOwnProfile } from "../services/profile";

export async function getMyProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  try {
    const data = await getOwnProfile(req.user.id, req.user.role);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}

export async function patchMyProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  try {
    const data = await updateOwnProfile(
      req.user.id,
      req.user.role,
      req.body ?? {},
    );
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
}
