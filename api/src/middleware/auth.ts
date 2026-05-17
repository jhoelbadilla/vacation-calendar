import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../shared/errors.js";

export const authCookieName = "vaccal_session";

export type AuthPayload = {
  sub: string;
};

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, env.SESSION_SECRET, { expiresIn: "30d" });
}

export function setSessionCookie(res: Response, userId: string) {
  res.cookie(authCookieName, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/"
  });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[authCookieName];
  if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Please log in.");

  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as AuthPayload;
    req.userId = payload.sub;
    next();
  } catch {
    throw new HttpError(401, "UNAUTHENTICATED", "Please log in.");
  }
}
