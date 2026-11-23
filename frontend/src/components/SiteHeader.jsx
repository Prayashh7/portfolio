import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePortfolio } from "../hooks/usePortfolio.jsx";

/*
  The header knows which sections exist rather than assuming. If a collection is
  emptied in the dashboard its section stops rendering, and its link disappears
  with it — no navigation pointing at nothing.
*/
function buildNav(data) {
  const items = [{ id: "home", label: "Home" }];
  if (data?.profile?.bio || data?.profile?.short_bio) items.push({ id: "about", label: "About" });
  if (data?.projects?.length) items.push({ id: "work", label: "Projects" });
  if (data?.services?.length) items.push({ id: "services", label: "Services" });
  if (data?.skill_categories?.some((group) => group.skills.length > 0)) {
    items.push({ id: "skills", label: "Skills" });
  }
  items.push({ id: "contact", label: "Contact" });
  return items;
}

/* Highlights whichever section is crossing the middle of the viewport. */
function useActiveSection(ids, enabled) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    if (!enabled) return undefined;

    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[visible.length - 1].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [ids.join(","), enabled]);

  return enabled ? active : null;
}

export default function SiteHeader() {
  const { data } = usePortfolio();
  const { pathname, hash } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";
  const items = useMemo(() => buildNav(data), [data]);
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const active = useActiveSection(ids, isHome && Boolean(data));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* The panel covers the page, so the page behind it should not scroll. */
  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [pathname, hash]);

  const name = data?.profile?.name;
  const firstName = name ? name.split(" ")[0] : "";

  return (
    <header className="header" data-scrolled={scrolled || undefined}>
      <div className="header__inner container">
        <Link to="/" className="brand" aria-label={name ? `${name} — home` : "Home"}>
          <span className="brand__mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="brand__text">
            <span className="brand__name">{firstName}</span>
            <span className="brand__role">{data?.profile?.title}</span>
          </span>
        </Link>

        <nav className="nav" id="site-nav" data-open={menuOpen || undefined} aria-label="Sections">
          <ul className="nav__list">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.id === "home" ? "/" : `/#${item.id}`}
                  className="nav__link"
                  data-active={active === item.id || undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <Link to="/#contact" className="button button--solid nav__cta">
            Let&rsquo;s Talk
          </Link>
        </nav>

        <button
          type="button"
          className="nav__toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav__toggle-bars" aria-hidden="true" />
          <span className="visually-hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
    </header>
  );
}
