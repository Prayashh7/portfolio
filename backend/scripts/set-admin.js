import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { pool, withTransaction } from "../db/pool.js";

/*
  Changes the admin email and/or password. Writes to `users` and nothing else.

  `npm run seed -- --force` also resets the password, but on the way past it
  rewrites every content table from content.json — fillTable does a plain
  DELETE first — so it is the wrong tool once the dashboard has been used. This
  script exists so there is a safe way to do it after launch.

  It reads the same three variables the seed does, so on cPanel you edit them in
  Setup Node.js App and then run this:

    ADMIN_EMAIL     the address you log in with
    ADMIN_PASSWORD  at least 10 characters, hashed here and never stored as given
    ADMIN_NAME      display name only

  Note this has nothing to do with the email shown on the public site. That one
  is profile.email, and the address contact-form replies go to is
  site_settings.contact_recipient_email — both edited in the dashboard.
*/

const log = (message) => console.log(`[set-admin] ${message}`);

/*
  Exported separately from the runner below so the branching can be tested with
  a fake client. `client` is a pg client already inside a transaction.
*/
export async function applyAdmin(client, { email, password, name }) {
  const password_hash = await bcrypt.hash(password, 12);

  /* lower(email) is what the unique index and the login query both use, so this
     finds exactly the row a login attempt would find. */
  const matched = await client.query("SELECT id FROM users WHERE lower(email) = $1", [email]);

  if (matched.rowCount > 0) {
    await client.query("UPDATE users SET password_hash = $2, name = $3 WHERE id = $1", [
      matched.rows[0].id,
      password_hash,
      name,
    ]);
    return `${email}: password and name updated`;
  }

  /* Nothing has that address. Every other case turns on how many accounts exist,
     because the email is the only thing identifying one and it no longer matches. */
  const { rows: accounts } = await client.query("SELECT id, email FROM users ORDER BY id");

  if (accounts.length === 0) {
    await client.query(
      "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      [email, name, password_hash]
    );
    return `${email}: created`;
  }

  if (accounts.length > 1) {
    /* Renaming would mean guessing which of them to rename, and guessing wrong
       locks him out of the other. Refuse and say what is there. */
    throw new Error(
      `${accounts.length} accounts exist (${accounts.map((row) => row.email).join(", ")}) and ` +
        `none is ${email}. To change one password, set ADMIN_EMAIL to that address. To rename ` +
        `one, delete the others first — there is no way to tell from here which you meant.`
    );
  }

  /* One account, and the address has changed: that is what "change my admin
     email" means, so rename in place rather than leaving two live logins. */
  const [only] = accounts;
  /* Read off before the UPDATE. The message needs the old address, and reading it
     back afterwards would depend on the row object not having been touched. */
  const previousEmail = only.email;
  await client.query("UPDATE users SET email = $2, password_hash = $3, name = $4 WHERE id = $1", [
    only.id,
    email,
    password_hash,
    name,
  ]);
  return `${previousEmail} -> ${email}: email, password and name updated`;
}

async function run() {
  const { email, password, name } = env.admin;

  /* Checked here rather than in env.js because every other command imports that
     module and none of the rest of the app needs these to be set. */
  if (!email) throw new Error("ADMIN_EMAIL is not set.");
  if (!password) throw new Error("ADMIN_PASSWORD is not set.");
  if (password.length < 10) {
    throw new Error(`ADMIN_PASSWORD must be at least 10 characters (got ${password.length}).`);
  }

  log(await withTransaction((client) => applyAdmin(client, { email, password, name })));
  log("done — the next login uses the new details, and any open session still works");
}

/* Only run when invoked directly. Importing this module for a test must not
   reach for the database. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(`[set-admin] failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
