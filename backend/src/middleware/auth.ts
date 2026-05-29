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

// We issue token for user access
export function issueAuthToken(user: AuthUser) {
  return jwt.sign(user, jwtSecret, { subject: user.id, expiresIn: "1d" });
}

// Auth middleware to protect routes and populate req.user
export function auth(req: Request, res: Response, next: NextFunction) {
  // Expecting header format for Authorization
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { message: "Missing bearer token" } });
  }

  const token = header.slice(7).trim();

  try {
    // Verify the token and decode the payload
    const decoded = jwt.verify(token, jwtSecret);

    // If the token is a simple string (not an object), we create a user with minimal info
    if (typeof decoded === "string") {
      req.user = {
        id: randomUUID(),
        email: decoded,
        name: decoded,
        role: "patient",
      };
      return next();
    }

    // If the token is an object, we expect it to have the user info
    const payload = decoded as JwtPayload & Partial<AuthUser>;

    // Populate req.user with the info from the token payload
    req.user = {
      id: String(payload.sub || payload.id || randomUUID()),
      email: String(payload.email || ""),
      name: String(payload.name || payload.email || "User"),
      role: payload.role === "doctor" ? "doctor" : "patient",
    };

    // Call the next middleware or route handler
    return next();
  } catch {
    // If token verification fails, respond with 401 Unauthorized
    return res
      .status(401)
      .json({ error: { message: "Invalid or expired token" } });
  }
}
