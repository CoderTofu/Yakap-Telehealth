const { readFileSync } = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");
const { Client } = require("pg");

const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
const composeFile = path.resolve(workspaceRoot, "docker-compose.yml");
const localSchemaPath = path.resolve(__dirname, "..", "sql", "init.sql");
const rootSchemaPath = path.resolve(workspaceRoot, "docker", "init.sql");

async function runDirect(databaseUrl) {
  const schemaSql = readFileSync(localSchemaPath, "utf8");
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query(schemaSql);
    console.log("Migration applied via DATABASE_URL.");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed via DATABASE_URL.", error);
    try {
      await client.end();
    } catch (_) {}
    process.exit(1);
  }
}

if (process.env.DATABASE_URL) {
  void runDirect(process.env.DATABASE_URL);
} else {
  const schemaSql = readFileSync(rootSchemaPath, "utf8");

  const result = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "db",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "yakap",
      "-d",
      "yakap_db",
    ],
    {
      cwd: workspaceRoot,
      env: process.env,
      input: schemaSql,
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(
      "Failed to run migration via docker compose exec.",
      result.error,
    );
    process.exit(result.status ?? 1);
  }

  process.exit(result.status ?? 0);
}
