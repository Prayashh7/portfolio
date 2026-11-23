import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";

export default function NotFoundPage() {
  useDocumentMeta({
    title: "Page not found — Prayash",
    description: "That page does not exist.",
  });

  return (
    <section className="case">
      <div className="container">
        <header className="case__head">
          <p className="case__meta">404</p>
          <h1 className="case__title">This page moved, or never existed.</h1>
          <p className="case__lede">
            The link you followed does not lead anywhere. Everything else is still where it was.
          </p>
          <div className="case__actions">
            <Link className="button button--solid" to="/">
              Back to the start
              <span className="arrow" aria-hidden="true">
                &rarr;
              </span>
            </Link>
            <Link className="button button--ghost" to="/#work">
              See the work
            </Link>
          </div>
        </header>
      </div>
    </section>
  );
}
