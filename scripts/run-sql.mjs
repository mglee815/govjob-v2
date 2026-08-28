// 스키마 마이그레이션(ALTER TABLE 등)을 SQL Editor 없이 직접 실행하기 위한 스크립트.
// .env.local의 SUPABASE_DB_URL(DB 직접 연결 - 강력한 권한)을 사용하므로 로컬에서만 실행할 것.
//
// 사용법:
//   node scripts/run-sql.mjs "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS foo TEXT;"
//   node scripts/run-sql.mjs --file path/to/migration.sql

import { readFileSync } from "fs";
import { Client } from "pg";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL이 .env.local에 없습니다.");
  process.exit(1);
}

const args = process.argv.slice(2);
let sql;
if (args[0] === "--file") {
  sql = readFileSync(args[1], "utf-8");
} else {
  sql = args.join(" ");
}
if (!sql?.trim()) {
  console.error('사용법: node scripts/run-sql.mjs "SQL문" 또는 --file path.sql');
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const res = await client.query(sql);
  console.log("OK");
  if (Array.isArray(res)) {
    for (const r of res) console.log(r.command, r.rowCount ?? "");
  } else {
    console.log(res.command, res.rowCount ?? "");
  }
} catch (err) {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
