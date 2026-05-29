const { readFileSync } = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
const composeFile = path.resolve(workspaceRoot, "docker-compose.yml");
const schemaSqlPath = path.resolve(workspaceRoot, "docker", "init.sql");
const schemaSql = readFileSync(schemaSqlPath, "utf8");

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
