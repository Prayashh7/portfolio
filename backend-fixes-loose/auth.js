import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../db/pool.js";
import { clearSession, issueSession } from "../middleware/auth.js";
import { asyncHandler, unauthorized } from "../utils/http.js";
import { emailField, parseBody } from "../utils/validate.js";

const loginSchema = z
  .object({
    email: emailField,
    password: z.string({ required_error: "Enter your password." }).min(1, "Enter your password.").max(200),
  })
  .strict();

/* When the email does not exist there is nothing to compare against, and
   returning immediately would make unknown accounts measurably faster to reject.
   Comparing against a throwaway hash of the same cost keeps both paths even. */
const DECOY_HASH = bcrypt.hashSync(crypto.randomBytes(24).toString("hex"), 12);

const SAME_ANSWER_EITHER_WAY = "Those details do not match an account.";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = parseBody(loginSchema, req.body);

  const { rows } = await query(
    "SELECT id, email, name, role, password_hash FROM users WHERE lower(email) = $1",
    [email]
  );
  const user = rows[0];
  const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DECOY_HASH);

  if (!user || !passwordMatches) throw unauthorized(SAME_ANSWER_EITHER_WAY);

  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  issueSession(res, user);

  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

export const logout = asyncHandler(async (req, res) => {
  clearSession(res);
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await query("SELECT id, email, name, role FROM users WHERE id = $1", [
    req.user.id,
  ]);
  if (!rows[0]) {
    clearSession(res);
    throw unauthorized("That account no longer exists.");
  }
  res.json({ user: rows[0] });
});
