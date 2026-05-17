import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default("postgres://vaccal:change-me@localhost:5432/vaccal"),
  SESSION_SECRET: z.string().min(24).default("development-session-secret-change-me"),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  TRUST_PROXY: z.coerce.boolean().default(false)
});

export const env = envSchema.parse(process.env);
