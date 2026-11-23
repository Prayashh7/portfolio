import SectionHead from "./SectionHead.jsx";
import { resolveMediaUrl } from "../services/api.js";
import { toParagraphs } from "../utils/format.js";

export default function About({ profile, settings }) {
  const paragraphs = toParagraphs(profile.bio || profile.short_bio);
  if (paragraphs.length === 0) return null;

  const image = resolveMediaUrl(profile.about_image_url);
  const resume = resolveMediaUrl(profile.resume_url);

  return (
    <section className="section section--ruled" id="about" data-reveal-scope>
      <div className="container">
        <SectionHead
          eyebrow="About"
          title={settings.about_heading}
          intro={settings.about_body}
        />

        <div className="about">
          {image && (
            <figure className="about__figure" data-reveal>
              <img
                className="about__image"
                src={image}
                alt={`${profile.name}, ${profile.title}`}
                width="677"
                height="1000"
                loading="lazy"
                decoding="async"
              />
            </figure>
          )}

          <div className="about__body">
            {paragraphs.map((paragraph, index) => (
              <p className="about__paragraph" key={index} data-reveal>
                {paragraph}
              </p>
            ))}

            {resume && (
              <p data-reveal>
                <a className="button button--ghost" href={resume} download>
                  Download CV
                  <span className="arrow" aria-hidden="true">
                    &darr;
                  </span>
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
