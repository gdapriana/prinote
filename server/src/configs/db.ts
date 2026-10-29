import { drizzle } from "drizzle-orm/node-postgres";
import env from "./env";
import * as schema from "@/drizzle";

const db = drizzle(env.DATABASE_URL!, {
  logger: env.NODE_ENV === "development",
  schema
});

export default db;
