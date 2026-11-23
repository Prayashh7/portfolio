import { usePortfolio } from "../hooks/usePortfolio.jsx";

/* Only links marked visible in the dashboard reach this list. A platform that has
   no account yet sits in the database switched off rather than shipping a dead
   link — turning it on is one toggle, not a code change. */
export default function SiteFooter() {
  const { data } = usePortfolio();
  if (!data) return null;

  const { profile, settings, social_links: socials } = data;
  const year = new Date().getFullYear();

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__identity">
          <p className="footer__name">{profile.name}</p>
          {profile.tagline && <p className="footer__tagline">{profile.tagline}</p>}
        </div>

        {socials.length > 0 && (
          <div className="footer__block">
            <h2 className="mono footer__label">Elsewhere</h2>
            <ul className="footer__links">
              {socials.map((link) => (
                <li key={link.id}>
                  <a
                    className="footer__link"
                    href={link.url}
                    target={link.url.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noreferrer"
                  >
                    <span>{link.label}</span>
                    {link.handle && <span className="footer__handle">{link.handle}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="footer__block">
          <h2 className="mono footer__label">Based in</h2>
          <p className="footer__detail">{profile.location}</p>
          {profile.timezone_label && (
            <p className="footer__detail footer__detail--muted">{profile.timezone_label}</p>
          )}
        </div>
      </div>

      <div className="container footer__base">
        <p className="footer__note">
          <span>&copy; {year}</span>
          {settings.footer_note && <span>{settings.footer_note}</span>}
        </p>
        <button type="button" className="footer__top" onClick={toTop}>
          Back to top
          <span className="footer__arrow" aria-hidden="true">
            &uarr;
          </span>
        </button>
      </div>
    </footer>
  );
}
