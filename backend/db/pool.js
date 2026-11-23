import pg from "pg";
import { env } from "../config/env.js";

/* pg turns DATE into a JavaScript Date, which then serialises as a full UTC
   timestamp and can shift the day backwards for anyone east of Greenwich.
   A date column holds a calendar date, so hand it back as the string it is. */
pg.types.setTypeParser(1082, (value) => value);

/* NUMERIC arrives as a string to protect precision. Latitude and longitude are
   the only numerics here and both fit a double comfortably. */
pg.types.setTypeParser(1700, (value) => (value === null ? null : Number.parseFloat(value)));

/*
  Certificate verification stays on. Several managed providers still present a
  self-signed certificate, which fails verification and sends people looking for
  a flag to turn it off — so the flag is here, named for what it costs, instead of
  being switched off quietly for everyone. See DATABASE_SSL in .env.example.
*/
const ssl = env.databaseSsl ? { rejectUnauthorized: !env.databaseSslNoVerify } : false;

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

if (env.databaseSslNoVerify) {
  console.warn(
    "[db] DATABASE_SSL_NO_VERIFY is set: the connection is encrypted but the server's " +
      "certificate is not checked. Only use this if your provider requires it."
  );
}

/* An idle client dropped by the database emits an error on the pool rather than
   on any request. Without this listener Node treats it as unhandled and exits. */
pool.on("error", (error) => {
  console.error("[db] idle client error:", error.message);
});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
