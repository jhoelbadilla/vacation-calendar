import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const dir = path.join(__dirname, "migrations");
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const alreadyApplied = await pool.query("select 1 from schema_migrations where id = $1", [file]);
    if (alreadyApplied.rowCount) continue;

    const sql = await fs.readFile(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (id) values ($1)", [file]);
      await client.query("commit");
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

migrate()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    pool.end().finally(() => process.exit(1));
  });
