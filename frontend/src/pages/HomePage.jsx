import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { usePortfolio } from "../hooks/usePortfolio.jsx";
import { useReveal } from "../hooks/useReveal.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { resolveMediaUrl } from "../services/api.js";
import { absoluteUrl } from "../utils/format.js";
import Hero from "../components/Hero.jsx";
import About from "../components/About.jsx";
import Work from "../components/Work.jsx";
import Services from "../components/Services.jsx";
import Skills from "../components/Skills.jsx";
import Background from "../components/Background.jsx";
import Contact from "../components/Contact.jsx";
import { ErrorState, Loader } from "../components/StateScreens.jsx";

/* Search engines get a Person record built from the same fields the page renders. */
function buildJsonLd(data, siteUrl, image) {
  if (!data) return null;
  const { profile, social_links: socials } = data;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    description: profile.short_bio || undefined,
    url: siteUrl || undefined,
    image: image || undefined,
    email: profile.email ? `mailto:${profile.email}` : undefined,
    address: profile.location
      ? { "@type": "PostalAddress", addressLocality: profile.location }
      : undefined,
    sameAs: socials.map((link) => link.url).filter((url) => !url.startsWith("mailto:")),
  };
}

export default function HomePage() {
  const { status, data, error, reload } = usePortfolio();
  const { hash } = useLocation();
  const root = useRef(null);

  useReveal(root, [status]);

  const siteUrl = data?.profile?.website_url;
  const shareImage = absoluteUrl(resolveMediaUrl(data?.settings?.og_image_url), siteUrl);
  const jsonLd = useMemo(() => buildJsonLd(data, siteUrl, shareImage), [data, siteUrl, shareImage]);

  useDocumentMeta({
    title: data?.settings?.seo_title,
    description: data?.settings?.seo_description,
    image: shareImage,
    canonical: siteUrl,
    type: "profile",
    jsonLd,
  });

  /* A link like /#work arrives before the sections exist, so the scroll waits for
     the content rather than landing at the top of an empty page. */
  useEffect(() => {
    if (status !== "ready" || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [status, hash]);

  if (status === "loading") return <Loader label="Loading" />;
  if (status === "error") return <ErrorState error={error} onRetry={reload} />;

  const {
    profile,
    settings,
    projects,
    skill_categories: skillGroups,
    services,
    experience,
    education,
    achievements,
    certifications,
    social_links: socials,
  } = data;

  return (
    <div ref={root}>
      <Hero profile={profile} settings={settings} />
      <About profile={profile} settings={settings} />
      <Work
        projects={projects}
        settings={settings}
        github={socials.find((link) => link.platform === "github")}
      />
      <Services services={services} settings={settings} />
      <Skills groups={skillGroups} settings={settings} />
      <Background
        education={education}
        experience={experience}
        certifications={certifications}
        achievements={achievements}
        settings={settings}
      />
      <Contact profile={profile} settings={settings} />
    </div>
  );
}
