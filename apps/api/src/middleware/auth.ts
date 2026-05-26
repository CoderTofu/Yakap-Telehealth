import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "patient" | "doctor";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const jwtSecret = process.env.JWT_SECRET || "dev-secret";

export function issueAuthToken(user: AuthUser) {
  return jwt.sign(user, jwtSecret, { subject: user.id, expiresIn: "7d" });
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { message: "Missing bearer token" } });
  }

  const token = header.slice(7).trim();

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded === "string") {
      req.user = {
        id: randomUUID(),
        email: decoded,
        name: decoded,
        role: "patient",
      };
      return next();
    }

    const payload = decoded as JwtPayload & Partial<AuthUser>;

    req.user = {
      id: String(payload.sub || payload.id || randomUUID()),
      email: String(payload.email || ""),
      name: String(payload.name || payload.email || "User"),
      role: payload.role === "doctor" ? "doctor" : "patient",
    };

    return next();
  } catch {
    return res
      .status(401)
      .json({ error: { message: "Invalid or expired token" } });
  }
}
