import { Link } from "react-router-dom";
import { getOverview } from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { formatDateTime } from "../../utils/format.js";
import { collections } from "./fields.js";
import PageHead from "./PageHead.jsx";

/*
  What is on the site right now, and who has written in. Counts come back keyed by
  table name, so the underscore in social_links is translated to the path the
  dashboard uses.
*/

const TILES = [
  { table: "projects", resource: "projects" },
  { table: "skill_categories", resource: "skill-categories" },
  { table: "skills", resource: "skills" },
  { table: "services", resource: "services" },
  { table: "experience", resource: "experience" },
  { table: "education", resource: "education" },
  { table: "certifications", resource: "certifications" },
  { table: "achievements", resource: "achievements" },
  { table: "social_links", resource: "social-links" },
];

export default function OverviewPage() {
  const { status, data, error } = useAsync((signal) => getOverview(signal));

  useDocumentMeta({ title: "Dashboard", robots: "noindex, nofollow" });

  return (
    <>
      <PageHead
        title="Overview"
        subtitle="Everything the public site reads comes from the sections below."
      />

      {status === "loading" && <p className="muted-line">Loading…</p>}

      {status === "error" && (
        <p className="notice notice--error" role="alert">
          {error.message}
        </p>
      )}

      {status === "ready" && (
        <>
          <ul className="tiles">
            {TILES.map((tile) => (
              <li key={tile.table}>
                <Link className="tile" to={`/admin/${tile.resource}`}>
                  <span className="tile__count">{data.counts[tile.table] ?? 0}</span>
                  <span className="tile__label">{collections[tile.resource].label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <section className="panel">
            <header className="panel__head">
              <h2 className="panel__title">Messages</h2>
              <p className="panel__note">
                {data.messages.unread > 0
                  ? `${data.messages.unread} unread of ${data.messages.total}`
                  : `${data.messages.total} in total, all read`}
              </p>
            </header>

            {data.recent_messages.length === 0 ? (
              <p className="muted-line">No one has used the contact form yet.</p>
            ) : (
              <ul className="feed">
                {data.recent_messages.map((message) => (
                  <li className="feed__item" key={message.id}>
                    <div className="feed__main">
                      <p className="feed__name">
                        {message.name}
                        {!message.is_read && <span className="dot" aria-label="Unread" />}
                      </p>
                      <p className="feed__line">{message.subject || message.email}</p>
                    </div>
                    <time className="feed__time" dateTime={message.created_at}>
                      {formatDateTime(message.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}

            <Link className="ghost-button" to="/admin/messages">
              Open messages
            </Link>
          </section>
        </>
      )}
    </>
  );
}
