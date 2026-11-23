import SectionHead from "./SectionHead.jsx";
import { formatRange } from "../utils/format.js";

/* Study and work read the same way, so they share one entry shape. */
function TimelineEntry({ heading, organisation, location, range, description }) {
  return (
    <li className="entry" data-reveal>
      <div className="entry__head">
        <h4 className="entry__heading">{heading}</h4>
        {range && <span className="entry__range">{range}</span>}
      </div>
      <p className="entry__org">
        {organisation}
        {location && <span className="entry__location"> · {location}</span>}
      </p>
      {description && <p className="entry__text">{description}</p>}
    </li>
  );
}

function Block({ label, children }) {
  return (
    <section className="record__block">
      <h3 className="mono record__label" data-reveal>
        {label}
      </h3>
      <ul className="record__list">{children}</ul>
    </section>
  );
}

export default function Background({
  education,
  experience,
  certifications,
  achievements,
  settings,
}) {
  const hasAnything =
    education.length + experience.length + certifications.length + achievements.length > 0;
  if (!hasAnything) return null;

  return (
    <section className="section section--ruled" id="background" data-reveal-scope>
      <div className="container">
        <SectionHead
          eyebrow="Record"
          title={settings.background_heading}
          intro={settings.background_intro}
        />

        <div className="record">
          <div className="record__column">
            {experience.length > 0 && (
              <Block label="Experience">
                {experience.map((item) => (
                  <TimelineEntry
                    key={item.id}
                    heading={item.position}
                    organisation={item.company}
                    location={item.location}
                    range={formatRange(item.start_date, item.end_date, item.is_current)}
                    description={item.description}
                  />
                ))}
              </Block>
            )}

            {education.length > 0 && (
              <Block label="Study">
                {education.map((item) => (
                  <TimelineEntry
                    key={item.id}
                    heading={item.degree}
                    organisation={item.institution}
                    location={item.location}
                    range={formatRange(item.start_date, item.end_date, item.is_current)}
                    description={item.description}
                  />
                ))}
              </Block>
            )}
          </div>

          <div className="record__column">
            {certifications.length > 0 && (
              <Block label="Training">
                {certifications.map((item) => (
                  <li className="entry" key={item.id} data-reveal>
                    <div className="entry__head">
                      <h4 className="entry__heading">{item.name}</h4>
                      {item.year && <span className="entry__range">{item.year}</span>}
                    </div>
                    {item.organization && <p className="entry__org">{item.organization}</p>}
                    {item.description && <p className="entry__text">{item.description}</p>}
                    {item.credential_url && (
                      <a
                        className="entry__link"
                        href={item.credential_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View credential
                        <span className="arrow" aria-hidden="true">
                          &nearr;
                        </span>
                      </a>
                    )}
                  </li>
                ))}
              </Block>
            )}

            {achievements.length > 0 && (
              <Block label="Worth stating">
                {achievements.map((item) => (
                  <li className="entry" key={item.id} data-reveal>
                    <div className="entry__head">
                      <h4 className="entry__heading">{item.title}</h4>
                      {item.year && <span className="entry__range">{item.year}</span>}
                    </div>
                    {item.description && <p className="entry__text">{item.description}</p>}
                  </li>
                ))}
              </Block>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
