import SectionHead from "./SectionHead.jsx";
import ContactForm from "./ContactForm.jsx";

function Channel({ label, value, href }) {
  if (!value) return null;
  return (
    <li className="channel">
      <span className="channel__key">{label}</span>
      {href ? (
        <a className="channel__value channel__value--link" href={href}>
          {value}
        </a>
      ) : (
        <span className="channel__value">{value}</span>
      )}
    </li>
  );
}

export default function Contact({ profile, settings }) {
  const phoneHref = profile.phone ? `tel:${profile.phone.replace(/[^\d+]/g, "")}` : null;
  const website = profile.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <section className="section section--ruled" id="contact" data-reveal-scope>
      <div className="container">
        <SectionHead
          eyebrow="Contact"
          title={settings.contact_heading}
          intro={settings.contact_intro}
        />

        <div className="contact">
          <div className="contact__channels" data-reveal>
            <ul className="channels">
              <Channel
                label="Email"
                value={profile.email}
                href={profile.email ? `mailto:${profile.email}` : null}
              />
              <Channel label="Phone" value={profile.phone} href={phoneHref} />
              <Channel label="Location" value={profile.location} />
              <Channel label="Site" value={website} href={profile.website_url} />
            </ul>
          </div>

          <div className="contact__form" data-reveal>
            {settings.contact_form_enabled ? (
              <ContactForm
                note={settings.contact_form_note}
                successMessage={
                  settings.contact_success_message || "Message received. I'll reply shortly."
                }
              />
            ) : (
              profile.email && (
                <a className="button button--solid" href={`mailto:${profile.email}`}>
                  Email me
                  <span className="arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
