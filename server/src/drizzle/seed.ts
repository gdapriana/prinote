import db, { pool } from "../configs/db.js";
import env from "../configs/env.js";
import { reset, seed } from "drizzle-seed";
import * as schema from "./index.js";
import { hash } from "@node-rs/argon2";

async function main() {
  if (
    env.NODE_ENV === "production" ||
    process.env.VERCEL ||
    process.env.ALLOW_DATABASE_RESET !== "true"
  ) {
    throw new Error(
      "Seed resets all data. Use a local development database and set ALLOW_DATABASE_RESET=true explicitly."
    );
  }
  const hashedPassword = await hash("11111111");

  await reset(db, schema);
  await seed(db, schema).refine(f => ({
    usersTable: {
      count: 10,
      columns: {
        hashedPassword: f.default({ defaultValue: hashedPassword })
      },
      with: {
        todosTable: 30
      }
    }
  }));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
