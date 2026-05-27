import { Pool } from "pg";
import path from "path";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ensure database session timezone is Manila so timestamptz outputs/local functions
// use Asia/Manila by default for each new connection.
pool.on("connect", (client) => {
  client
    .query("SET TIME ZONE 'Asia/Manila'")
    .catch((err) => console.error("Failed to set DB time zone:", err));
});

pool.on("error", (error) => {
  console.error("Unexpected DB client error", error);
  process.exit(-1);
});

export default pool;
