import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProject, resolveMediaUrl } from "../services/api.js";
import { usePortfolio } from "../hooks/usePortfolio.jsx";
import { useReveal } from "../hooks/useReveal.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { absoluteUrl, toParagraphs } from "../utils/format.js";
import { ErrorState, Loader } from "../components/StateScreens.jsx";

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div className="fact">
      <dt className="fact__key">{label}</dt>
      <dd className="fact__value">{value}</dd>
    </div>
  );
}

export default function ProjectPage() {
  const { slug } = useParams();
  const { data } = usePortfolio();
  const [state, setState] = useState({ status: "loading", project: null, error: null });
  const root = useRef(null);

  useReveal(root, [state.status, slug]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", project: null, error: null });

    getProject(slug, controller.signal)
      .then((project) => setState({ status: "ready", project, error: null }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ status: "error", project: null, error });
      });

    return () => controller.abort();
  }, [slug]);

  const { project } = state;
  const siteUrl = data?.profile?.website_url;
  const cover = resolveMediaUrl(project?.cover_image_url);

  useDocumentMeta({
    title: project && data ? `${project.name} — ${data.profile.name}` : undefined,
    description: project?.summary || undefined,
    image: absoluteUrl(cover, siteUrl),
    canonical: siteUrl ? `${siteUrl.replace(/\/$/, "")}/work/${slug}` : undefined,
    type: "article",
  });

  if (state.status === "loading") return <Loader label="Loading" />;

  if (state.status === "error") {
    return (
      <div className="container case__missing">
        <ErrorState error={state.error} />
        <Link className="button button--ghost" to="/#work">
          <span className="arrow" aria-hidden="true">
            &larr;
          </span>
          All work
        </Link>
      </div>
    );
  }

  const projects = data?.projects ?? [];
  const index = projects.findIndex((item) => item.slug === slug);
  const next = index >= 0 && projects.length > 1 ? projects[(index + 1) % projects.length] : null;
  const paragraphs = toParagraphs(project.description);

  return (
    <article className="case" ref={root}>
      <div className="container">
        <Link className="case__back" to="/#work">
          <span className="arrow" aria-hidden="true">
            &larr;
          </span>
          All work
        </Link>

        <header className="case__head" data-reveal-scope>
          <p className="case__meta" data-reveal>
            {[project.category, project.role, project.year].filter(Boolean).join(" · ")}
          </p>
          <h1 className="case__title" data-reveal>
            {project.name}
          </h1>
          {project.summary && (
            <p className="case__lede" data-reveal>
              {project.summary}
            </p>
          )}
          <div className="case__actions" data-reveal>
            {project.live_url && (
              <a
                className="button button--solid"
                href={project.live_url}
                target="_blank"
                rel="noreferrer"
              >
                Open live site
                <span className="arrow" aria-hidden="true">
                  &nearr;
                </span>
              </a>
            )}
            {project.github_url && (
              <a
                className="button button--ghost"
                href={project.github_url}
                target="_blank"
                rel="noreferrer"
              >
                Source
                <span className="arrow" aria-hidden="true">
                  &nearr;
                </span>
              </a>
            )}
          </div>
        </header>

        {cover && (
          <figure className="case__cover" data-reveal>
            <img src={cover} alt={project.name} width="1400" height="900" decoding="async" />
          </figure>
        )}

        <div className="case__body" data-reveal-scope>
          <div className="case__notes">
            {paragraphs.map((paragraph, position) => (
              <p key={position} data-reveal>
                {paragraph}
              </p>
            ))}
          </div>

          <aside className="case__side" data-reveal>
            <dl className="facts">
              <Fact label="Category" value={project.category} />
              <Fact label="Role" value={project.role} />
              <Fact label="Year" value={project.year} />
            </dl>

            {project.technologies?.length > 0 && (
              <ul className="tags case__stack">
                {project.technologies.map((item) => (
                  <li className="tag" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {project.images?.length > 0 && (
          <div className="case__gallery" data-reveal-scope>
            {project.images.map((image) => (
              <figure key={image.id} data-reveal>
                <img
                  src={resolveMediaUrl(image.url)}
                  alt={image.alt || ""}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        )}

        {next && (
          <nav className="case__next" aria-label="More work">
            <Link className="case__next-link" to={`/work/${next.slug}`}>
              <span className="mono">Next project</span>
              <span className="case__next-name">{next.name}</span>
              <span className="arrow" aria-hidden="true">
                &rarr;
              </span>
            </Link>
          </nav>
        )}
      </div>
    </article>
  );
}
