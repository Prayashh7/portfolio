import SectionHead from "./SectionHead.jsx";

/* Ordered weakest to strongest so the position in the array is the meter reading. */
const LEVELS = ["working", "confident", "advanced"];

function Meter({ level }) {
  const filled = LEVELS.indexOf(level) + 1;
  if (filled === 0) return null;

  return (
    <span className="meter" role="img" aria-label={`Confidence: ${level}`}>
      {LEVELS.map((step, index) => (
        <span className="meter__step" key={step} data-on={index < filled || undefined} />
      ))}
    </span>
  );
}

export default function Skills({ groups, settings }) {
  const populated = groups.filter((group) => group.skills.length > 0);
  if (populated.length === 0) return null;

  return (
    <section className="section section--ruled" id="skills" data-reveal-scope>
      <div className="container">
        <SectionHead
          eyebrow="Skills"
          title={settings.skills_heading}
          intro={settings.skills_intro}
        />

        <div className="skills">
          {populated.map((group) => (
            <section className="group" key={group.slug} data-reveal>
              <h3 className="group__name">{group.name}</h3>
              {group.description && <p className="group__note">{group.description}</p>}

              <ul className="group__list">
                {group.skills.map((skill) => (
                  <li className="skill" key={skill.id}>
                    <span className="skill__name">{skill.name}</span>
                    <Meter level={skill.level} />
                    {skill.note && <span className="skill__note">{skill.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
