import { useEffect } from "react";

/*
  Keeps <head> in step with whatever the database says. The tags in index.html are
  the pre-JavaScript defaults; this replaces them once the content has loaded, so
  the page title and the share preview stay editable in the dashboard.
*/

/* `attribute` is "name" for standard meta tags and "property" for Open Graph. */
function setMeta(attribute, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.append(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(href) {
  if (!href) return;
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.rel = "canonical";
    document.head.append(tag);
  }
  tag.href = href;
}

function setJsonLd(data) {
  const existing = document.getElementById("structured-data");
  if (!data) {
    existing?.remove();
    return;
  }
  const tag = existing ?? document.createElement("script");
  tag.id = "structured-data";
  tag.type = "application/ld+json";
  tag.textContent = JSON.stringify(data);
  if (!existing) document.head.append(tag);
}

/* The dashboard is the only place that asks not to be indexed. Removing the tag
   when nothing asks for it keeps a client-side route change from leaving a
   noindex behind on a public page. */
function setRobots(value) {
  const existing = document.head.querySelector('meta[name="robots"]');
  if (!value) {
    existing?.remove();
    return;
  }
  const tag = existing ?? document.createElement("meta");
  tag.setAttribute("name", "robots");
  tag.setAttribute("content", value);
  if (!existing) document.head.append(tag);
}

export function useDocumentMeta({
  title,
  description,
  image,
  canonical,
  type = "website",
  jsonLd,
  robots,
}) {
  useEffect(() => {
    if (title) document.title = title;

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", type);
    setCanonical(canonical);
    setJsonLd(jsonLd);
    setRobots(robots);
  }, [title, description, image, canonical, type, jsonLd, robots]);
}
