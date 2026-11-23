import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PortfolioProvider, usePortfolio } from "../hooks/usePortfolio.jsx";
import SiteHeader from "./SiteHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";

/* A new page starts at the top, unless the URL points at a section. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

/* The accent is editable in the dashboard, so it is applied at runtime rather
   than compiled into the stylesheet. */
function AccentColor() {
  const { data } = usePortfolio();
  const accent = data?.settings?.accent_color;

  useEffect(() => {
    if (!accent) return;
    document.documentElement.style.setProperty("--cyan", accent);
  }, [accent]);

  return null;
}

export default function PublicLayout() {
  return (
    <PortfolioProvider>
      <ScrollToTop />
      <AccentColor />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </PortfolioProvider>
  );
}
