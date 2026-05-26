import type { Request, Response } from "express";

import { issueAuthToken } from "../middleware/auth";
import { verifyLoginPassword } from "../services/auth";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email) {
    return res.status(400).json({ error: { message: "Email is required" } });
  }

  if (!password) {
    return res.status(400).json({ error: { message: "Password is required" } });
  }

  const user = await verifyLoginPassword(email, password);

  if (!user) {
    return res.status(401).json({ error: { message: "Invalid credentials" } });
  }

  const token = issueAuthToken(user);

  return res.json({
    data: {
      token,
      user,
    },
  });
}

export function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  return res.json({ data: req.user });
}
