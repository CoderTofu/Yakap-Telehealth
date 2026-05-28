import { Pool } from "pg";
import path from "path";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c timezone=Asia/Manila",
});

pool.on("error", (error) => {
  console.error("Unexpected DB client error", error);
  process.exit(-1);
});

export default pool;
