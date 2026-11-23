import { useState } from "react";
import { listMessages, markMessageRead, removeMessage } from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { formatDateTime } from "../../utils/format.js";
import ConfirmDelete from "./ConfirmDelete.jsx";
import PageHead from "./PageHead.jsx";

/*
  Everything sent through the contact form. Read state is stored, so an enquiry
  answered on one machine is not still bold on another.
*/

function Message({ message, onChange, onRemove }) {
  const [open, setOpen] = useState(!message.is_read);
  const [busy, setBusy] = useState(false);

  const toggleRead = async () => {
    setBusy(true);
    try {
      await onChange(!message.is_read);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="mail" data-unread={!message.is_read || undefined}>
      <button
        type="button"
        className="mail__summary"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="mail__who">
          {message.name}
          {!message.is_read && <span className="dot" aria-label="Unread" />}
        </span>
        <span className="mail__subject">{message.subject || "No subject"}</span>
        <time className="mail__time" dateTime={message.created_at}>
          {formatDateTime(message.created_at)}
        </time>
      </button>

      {open && (
        <div className="mail__body">
          <p className="mail__text">{message.message}</p>

          <div className="mail__foot">
            <a className="ghost-button" href={`mailto:${message.email}`}>
              Reply to {message.email}
            </a>
            <button type="button" className="ghost-button" onClick={toggleRead} disabled={busy}>
              {message.is_read ? "Mark unread" : "Mark read"}
            </button>
            <ConfirmDelete label="this message" onConfirm={onRemove} />
          </div>
        </div>
      )}
    </li>
  );
}

export default function MessagesPage() {
  const { status, data, error, reload } = useAsync((signal) => listMessages(signal));
  const [showUnread, setShowUnread] = useState(false);

  useDocumentMeta({ title: "Messages — Dashboard", robots: "noindex, nofollow" });

  const messages = data || [];
  const unread = messages.filter((message) => !message.is_read);
  const shown = showUnread ? unread : messages;

  return (
    <>
      <PageHead
        title="Messages"
        subtitle={
          messages.length > 0
            ? `${unread.length} unread of ${messages.length}.`
            : "Sent through the contact form on the site."
        }
        action={
          unread.length > 0 ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setShowUnread((current) => !current)}
            >
              {showUnread ? "Show all" : "Show unread only"}
            </button>
          ) : undefined
        }
      />

      {status === "loading" && <p className="muted-line">Loading…</p>}

      {status === "error" && (
        <p className="notice notice--error" role="alert">
          {error.message}
        </p>
      )}

      {status === "ready" && shown.length === 0 && (
        <p className="muted-line">
          {showUnread ? "Nothing unread." : "No one has used the contact form yet."}
        </p>
      )}

      {shown.length > 0 && (
        <ul className="mails">
          {shown.map((message) => (
            <Message
              key={message.id}
              message={message}
              onChange={async (isRead) => {
                await markMessageRead(message.id, isRead);
                reload();
              }}
              onRemove={async () => {
                await removeMessage(message.id);
                reload();
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}
