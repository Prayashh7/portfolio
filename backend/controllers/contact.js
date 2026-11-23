import { z } from "zod";
import { query } from "../db/pool.js";
import { readSingleton } from "../db/singletons.js";
import { sendContactNotification } from "../services/mailer.js";
import { asyncHandler, forbidden } from "../utils/http.js";
import { emailField, nullableString, parseBody } from "../utils/validate.js";

const messageSchema = z
  .object({
    name: z
      .string({ required_error: "Tell me your name." })
      .trim()
      .min(2, "Tell me your name.")
      .max(120, "Keep this under 120 characters."),
    email: emailField,
    subject: nullableString(200).optional(),
    message: z
      .string({ required_error: "Write a short message." })
      .trim()
      .min(10, "A little more detail helps — ten characters at least.")
      .max(4000, "Keep this under 4000 characters."),
  })
  .strict();

export const submitMessage = asyncHandler(async (req, res) => {
  const settings = await readSingleton("settings", { includeHidden: true });
  if (settings?.contact_form_enabled === false) {
    throw forbidden("The contact form is closed at the moment.");
  }

  const data = parseBody(messageSchema, req.body);

  const { rows } = await query(
    `INSERT INTO contact_messages (name, email, subject, message, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [
      data.name,
      data.email,
      data.subject ?? null,
      data.message,
      req.get("user-agent")?.slice(0, 300) ?? null,
    ]
  );

  /* The message is stored before this point, so a mail outage is an operator
     problem to read in the logs, not something the sender should see. */
  try {
    const outcome = await sendContactNotification(data, settings?.contact_recipient_email);
    if (!outcome.sent && outcome.reason === "no-recipient") {
      console.warn("[contact] SMTP is configured but no recipient address is set.");
    }
  } catch (error) {
    console.error("[contact] notification email failed", error);
  }

  res.status(201).json(rows[0]);
});
