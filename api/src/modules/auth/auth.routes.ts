import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { clearSessionCookie, requireAuth, setSessionCookie } from "../../middleware/auth.js";
import { HttpError } from "../../shared/errors.js";

const router = Router();
const usernameSchema = z.string().regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, dash, and underscore are allowed.").min(3).max(32);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(12)
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

function toUser(row: { id: string; username: string; email: string }) {
  return { id: row.id, username: row.username, email: row.email };
}

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const result = await pool.query(
      `insert into users (username, username_normalized, email, email_normalized, password_hash)
       values ($1, $2, $3, $4, $5)
       returning id, username, email`,
      [body.username, body.username.toLowerCase(), body.email, body.email.toLowerCase(), passwordHash]
    );
    const user = toUser(result.rows[0]);
    setSessionCookie(res, user.id);
    res.status(201).json({ user });
  } catch (error: any) {
    if (error?.code === "23505") {
      next(new HttpError(409, "DUPLICATE_ACCOUNT", "Username or email is already in use."));
      return;
    }
    next(error);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const normalized = body.identifier.toLowerCase();
    const result = await pool.query(
      `select id, username, email, password_hash
       from users
       where username_normalized = $1 or email_normalized = $1`,
      [normalized]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid username, email, or password.");
    }

    setSessionCookie(res, user.id);
    res.json({ user: toUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("select id, username, email from users where id = $1", [req.userId]);
    if (!result.rowCount) throw new HttpError(401, "UNAUTHENTICATED", "Please log in.");
    res.json({ user: toUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
