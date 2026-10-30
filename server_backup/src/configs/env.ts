import dotenv from "dotenv-flow";
dotenv.config();
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z.url(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  CORS_ORIGIN: z.url().optional()
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment configuration");
  console.error(z.prettifyError(result.error));
  process.exit(1);
}

export const env: Readonly<Env> = Object.freeze(result.data);

export default env;
