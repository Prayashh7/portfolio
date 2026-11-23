import { useState } from "react";
import { sendMessage } from "../services/api.js";

/*
  A real form: it posts to the API, which validates the same fields again and
  stores the message. Validation runs here first so the obvious mistakes are
  caught without a round trip, and any field errors the server sends back are
  merged in afterwards.
*/

const EMPTY = { name: "", email: "", subject: "", message: "" };

function validate(values) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = "Please enter an address I can reply to.";
  }
  if (values.message.trim().length < 10) errors.message = "A little more detail would help.";
  return errors;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="field" data-invalid={error ? "true" : undefined}>
      <label className="field__label" htmlFor={id}>
        {label}
        {hint && <span className="field__hint">{hint}</span>}
      </label>
      {children}
      {error && (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactForm({ note, successMessage }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [failure, setFailure] = useState(null);

  const update = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: null } : current));
  };

  const describedBy = (field) => (errors[field] ? `contact-${field}-error` : undefined);

  const submit = async (event) => {
    event.preventDefault();

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("sending");
    setFailure(null);

    try {
      await sendMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim() || null,
        message: values.message.trim(),
      });
      setValues(EMPTY);
      setStatus("sent");
    } catch (error) {
      setStatus("failed");
      setFailure(error.message);
      if (error.fields) setErrors(error.fields);
    }
  };

  if (status === "sent") {
    return (
      <div className="form form--sent" role="status">
        <p className="form__sent-mark" aria-hidden="true">
          &#10003;
        </p>
        <p className="form__sent-text">{successMessage}</p>
        <button type="button" className="button button--ghost" onClick={() => setStatus("idle")}>
          Send another
        </button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form__row">
        <Field id="contact-name" label="Name" error={errors.name}>
          <input
            className="field__input"
            id="contact-name"
            name="name"
            type="text"
            value={values.name}
            onChange={update}
            autoComplete="name"
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={describedBy("name")}
            disabled={sending}
          />
        </Field>

        <Field id="contact-email" label="Email" error={errors.email}>
          <input
            className="field__input"
            id="contact-email"
            name="email"
            type="email"
            value={values.email}
            onChange={update}
            autoComplete="email"
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={describedBy("email")}
            disabled={sending}
          />
        </Field>
      </div>

      <Field id="contact-subject" label="Subject" hint="Optional" error={errors.subject}>
        <input
          className="field__input"
          id="contact-subject"
          name="subject"
          type="text"
          value={values.subject}
          onChange={update}
          aria-invalid={errors.subject ? "true" : undefined}
          aria-describedby={describedBy("subject")}
          disabled={sending}
        />
      </Field>

      <Field id="contact-message" label="Message" error={errors.message}>
        <textarea
          className="field__input field__input--area"
          id="contact-message"
          name="message"
          rows="6"
          value={values.message}
          onChange={update}
          aria-invalid={errors.message ? "true" : undefined}
          aria-describedby={describedBy("message")}
          disabled={sending}
        />
      </Field>

      {failure && (
        <p className="form__failure" role="alert">
          {failure}
        </p>
      )}

      <div className="form__foot">
        <button type="submit" className="button button--solid" disabled={sending}>
          {sending ? "Sending" : "Send message"}
          {sending && <span className="form__spinner" aria-hidden="true" />}
        </button>
        {note && <p className="form__note">{note}</p>}
      </div>
    </form>
  );
}
