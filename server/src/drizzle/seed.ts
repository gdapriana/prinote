import db from "@/configs/db";
import { reset, seed } from "drizzle-seed";
import * as schema from "@/drizzle";
import { hash } from "@node-rs/argon2";

async function main() {
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

main();
