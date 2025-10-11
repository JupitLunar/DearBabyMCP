import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  SOLIDSTART_BASE_URL: z
    .string()
    .url({ message: "SOLIDSTART_BASE_URL must be a valid URL" }),
  SOLIDSTART_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
});

const parsed = EnvSchema.parse(process.env);

export const config = {
  env: parsed.NODE_ENV,
  port: parsed.PORT,
  logLevel:
    parsed.LOG_LEVEL ?? (parsed.NODE_ENV === "production" ? "info" : "debug"),
  solidStart: {
    baseUrl: parsed.SOLIDSTART_BASE_URL,
    apiKey: parsed.SOLIDSTART_API_KEY,
  },
} as const;

export type AppConfig = typeof config;
