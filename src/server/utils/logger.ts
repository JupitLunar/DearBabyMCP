import pino from "pino";
import { config } from "../../config/env";

export const logger = pino({
  level: config.logLevel,
});

export type Logger = typeof logger;
