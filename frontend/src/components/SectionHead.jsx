/*
  The heading block every section shares: a label, a title, and an optional line
  of introduction. All three strings come from site settings.
*/
export default function SectionHead({ eyebrow, title, intro, aside }) {
  const main = (
    <>
      {eyebrow && (
        <p className="eyebrow" data-reveal>
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="section-title" data-reveal>
          {title}
        </h2>
      )}
      {intro && (
        <p className="section-intro" data-reveal>
          {intro}
        </p>
      )}
    </>
  );

  if (!aside) {
    return (
      <header className="section-head" data-reveal-scope>
        {main}
      </header>
    );
  }

  return (
    <header className="section-head section-head--split" data-reveal-scope>
      <div className="section-head__main">{main}</div>
      <div className="section-head__aside" data-reveal>
        {aside}
      </div>
    </header>
  );
}
