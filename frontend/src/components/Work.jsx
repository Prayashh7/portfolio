import SectionHead from "./SectionHead.jsx";
import ProjectCard from "./ProjectCard.jsx";

export default function Work({ projects, settings, github }) {
  if (projects.length === 0) return null;

  return (
    <section className="section section--ruled" id="work" data-reveal-scope>
      <div className="container">
        <SectionHead
          eyebrow="Work"
          title={settings.projects_heading}
          intro={settings.projects_intro}
        />

        <div className="work">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {github && (
          <aside className="repo" data-reveal>
            <div className="repo__text">
              <p className="mono repo__label">{github.label}</p>
              {github.handle && <p className="repo__handle">{github.handle}</p>}
            </div>
            <a className="button button--solid" href={github.url} target="_blank" rel="noreferrer">
              Open {github.label}
              <span className="arrow" aria-hidden="true">
                &nearr;
              </span>
            </a>
          </aside>
        )}
      </div>
    </section>
  );
}
