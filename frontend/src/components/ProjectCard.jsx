import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../services/api.js";

/*
  One project, as a full-width row. The media links through to the detail page as
  well as the title does — it is hidden from assistive technology and taken out of
  the tab order so the row still announces as a single destination.
*/
export default function ProjectCard({ project }) {
  const cover = resolveMediaUrl(project.cover_image_url);
  const detail = `/work/${project.slug}`;

  return (
    <article className="project" data-reveal-scope>
      <p className="project__meta" data-reveal>
        <span className="project__category">{project.category}</span>
        <span className="project__facts">
          {project.role && <span>{project.role}</span>}
          {project.year && <span className="project__year">{project.year}</span>}
        </span>
      </p>

      <Link className="project__media" to={detail} tabIndex={-1} aria-hidden="true" data-reveal>
        {cover && (
          <img
            className="project__image"
            src={cover}
            alt=""
            width="1400"
            height="900"
            loading="lazy"
            decoding="async"
          />
        )}
        {project.live_url && (
          <span className="project__live">
            <span className="project__live-dot" />
            Live
          </span>
        )}
        <span className="project__sheen" />
      </Link>

      <div className="project__body">
        <h3 className="project__name" data-reveal>
          <Link to={detail}>{project.name}</Link>
        </h3>

        {project.summary && (
          <p className="project__summary" data-reveal>
            {project.summary}
          </p>
        )}

        {project.technologies?.length > 0 && (
          <ul className="tags" data-reveal>
            {project.technologies.map((item) => (
              <li className="tag" key={item}>
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="project__actions" data-reveal>
          {project.live_url && (
            <a
              className="button button--ghost"
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
          <Link className="button button--quiet" to={detail}>
            Case notes
            <span className="arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
