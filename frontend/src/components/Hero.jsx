import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import PortraitScene from "./PortraitScene.jsx";
import { usePointer } from "../hooks/usePointer.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";

/* Turns the stored coordinates into something that reads like a location fix. */
function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lon}`;
}

/* The scene stops rendering when the hero is not on screen. */
function useInView(ref) {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.01 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

export default function Hero({ profile, settings }) {
  const root = useRef(null);
  const inView = useInView(root);
  const reduced = useReducedMotion();
  const pointer = usePointer(!reduced);

  /* The one orchestrated entrance on the site. Everything below the fold gets the
     quieter scroll reveal instead. */
  useLayoutEffect(() => {
    if (!root.current || reduced) return undefined;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });
      timeline
        .from(".hero__name", { yPercent: 118, duration: 1.2 })
        .from(".hero__eyebrow", { opacity: 0, x: -14 }, 0.15)
        .from(".hero__title", { opacity: 0, y: 14 }, 0.5)
        .from(".hero__headline", { opacity: 0, y: 18 }, 0.65)
        .from(".hero__lede", { opacity: 0, y: 18 }, 0.78)
        .from(".hero__actions > *", { opacity: 0, y: 16, stagger: 0.09 }, 0.9)
        .from(".hero__meta > *", { opacity: 0, y: 12, stagger: 0.07 }, 1.05);
    }, root);

    return () => context.revert();
  }, [reduced]);

  const firstName = profile.name.split(" ")[0];
  const coordinates = formatCoordinates(profile.latitude, profile.longitude);

  return (
    <section className="hero" id="home" ref={root}>
      <div className="hero__grid container">
        <div className="hero__copy">
          {settings.hero_eyebrow && <p className="eyebrow hero__eyebrow">{settings.hero_eyebrow}</p>}

          <h1 className="hero__lockup">
            <span className="hero__mask">
              <span className="hero__name">{firstName}</span>
            </span>
            <span className="hero__title">{profile.title}</span>
          </h1>

          {settings.hero_headline && <p className="hero__headline">{settings.hero_headline}</p>}
          {settings.hero_lede && <p className="hero__lede">{settings.hero_lede}</p>}

          <div className="hero__actions">
            {settings.hero_primary_cta_label && settings.hero_primary_cta_href && (
              <a className="button button--solid" href={settings.hero_primary_cta_href}>
                {settings.hero_primary_cta_label}
              </a>
            )}
            {settings.hero_secondary_cta_label && settings.hero_secondary_cta_href && (
              <a className="button button--ghost" href={settings.hero_secondary_cta_href}>
                {settings.hero_secondary_cta_label}
                <span className="arrow" aria-hidden="true">
                  &rarr;
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="hero__visual">
          <PortraitScene
            profile={profile}
            accent={settings.accent_color || "#22d3ee"}
            pointer={pointer}
            active={inView && !reduced}
          />
        </div>
      </div>

      <div className="hero__meta container">
        <p className="hero__fact">
          <span className="hero__fact-key">Based in</span>
          <span className="hero__fact-value">{profile.location}</span>
        </p>
        {coordinates && (
          <p className="hero__fact">
            <span className="hero__fact-key">Coordinates</span>
            <span className="hero__fact-value">{coordinates}</span>
          </p>
        )}
        {profile.timezone_label && (
          <p className="hero__fact">
            <span className="hero__fact-key">Timezone</span>
            <span className="hero__fact-value">{profile.timezone_label}</span>
          </p>
        )}
        {profile.availability_note && (
          <p className="hero__fact hero__fact--status" data-status={profile.availability_status}>
            <span className="hero__dot" aria-hidden="true" />
            <span className="hero__fact-value">{profile.availability_note}</span>
          </p>
        )}
      </div>
    </section>
  );
}
