import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { calendarRouter } from "./modules/calendar/calendar.routes.js";
import { profilesRouter } from "./modules/profiles/profiles.routes.js";
import { errorHandler } from "./shared/errors.js";

export function createApp() {
  const app = express();

  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api", authRouter);
  app.use("/api/profiles", profilesRouter);
  app.use("/api/profiles/:profileId/day-overrides", calendarRouter);

  app.use(errorHandler);
  return app;
}
