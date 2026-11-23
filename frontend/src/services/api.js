/*
  The one place the frontend talks to the API. Both the public site and the admin
  dashboard import from here.
*/

const API_BASE = trimSlash(import.meta.env.VITE_API_BASE_URL || "/api");
const MEDIA_BASE = trimSlash(import.meta.env.VITE_MEDIA_BASE_URL || deriveMediaBase());

function trimSlash(value) {
  return value.replace(/\/+$/, "");
}

/* Media sits next to the API, not next to the site. If VITE_API_BASE_URL is
   absolute we can work out the media origin from it; in development the Vite
   proxy forwards /media, so an empty base is correct. */
function deriveMediaBase() {
  if (/^https?:\/\//.test(API_BASE)) return API_BASE.replace(/\/api$/, "");
  return "";
}

/*
  Turns a stored path into something a browser can load.
  /media/... is served by the API. Anything else is site-relative and untouched,
  which is how /og-image.jpg keeps resolving against the site's own origin.
*/
export function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (path.startsWith("/media/")) return `${MEDIA_BASE}${path}`;
  return path;
}

export class ApiError extends Error {
  constructor(message, { status = 0, fields = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, { method = "GET", body, signal, isFormData = false } = {}) {
  const headers = {};
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

  /* Double-submit CSRF: echo the readable cookie back in a header. The session
     cookie itself is httpOnly, so this is the only token JavaScript can see. */
  if (method !== "GET") {
    const csrf = readCookie("csrf_token");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      signal,
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause.name === "AbortError") throw cause;
    throw new ApiError("Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.error;
    throw new ApiError(detail?.message || `Request failed (${response.status})`, {
      status: response.status,
      fields: detail?.fields || null,
    });
  }

  return payload;
}

/* ------------------------------------------------------------------ public */

export const getPortfolio = (signal) => request("/portfolio", { signal });
export const getProject = (slug, signal) => request(`/projects/${encodeURIComponent(slug)}`, { signal });
export const sendMessage = (payload) => request("/contact", { method: "POST", body: payload });

/* -------------------------------------------------------------------- auth */

export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } });
export const logout = () => request("/auth/logout", { method: "POST" });
export const getCurrentUser = (signal) => request("/auth/me", { signal });

/* ------------------------------------------------------------------- admin */

/* Nine collections behave identically, so they share one set of calls rather
   than forty-five near-copies. `resource` is a path segment from ADMIN_RESOURCES. */
export const ADMIN_RESOURCES = [
  "projects",
  "skill-categories",
  "skills",
  "services",
  "experience",
  "education",
  "achievements",
  "certifications",
  "social-links",
];

export const adminList = (resource, signal) => request(`/admin/${resource}`, { signal });
export const adminGet = (resource, id, signal) => request(`/admin/${resource}/${id}`, { signal });
export const adminCreate = (resource, body) => request(`/admin/${resource}`, { method: "POST", body });
export const adminUpdate = (resource, id, body) =>
  request(`/admin/${resource}/${id}`, { method: "PUT", body });
export const adminRemove = (resource, id) => request(`/admin/${resource}/${id}`, { method: "DELETE" });

export const getOverview = (signal) => request("/admin/overview", { signal });

export const getAdminProfile = (signal) => request("/admin/profile", { signal });
export const updateProfile = (body) => request("/admin/profile", { method: "PUT", body });

export const getAdminSettings = (signal) => request("/admin/settings", { signal });
export const updateSettings = (body) => request("/admin/settings", { method: "PUT", body });

export const getProjectImages = (projectId, signal) =>
  request(`/admin/projects/${projectId}/images`, { signal });
export const addProjectImage = (projectId, body) =>
  request(`/admin/projects/${projectId}/images`, { method: "POST", body });
export const updateProjectImage = (id, body) =>
  request(`/admin/project-images/${id}`, { method: "PUT", body });
export const removeProjectImage = (id) => request(`/admin/project-images/${id}`, { method: "DELETE" });

export const listMessages = (signal) => request("/admin/messages", { signal });
export const markMessageRead = (id, isRead) =>
  request(`/admin/messages/${id}`, { method: "PATCH", body: { is_read: isRead } });
export const removeMessage = (id) => request(`/admin/messages/${id}`, { method: "DELETE" });

/* Seeded artwork plus anything uploaded, for the image picker. */
export const listMedia = (signal) => request("/admin/media", { signal });
export const removeUpload = (filename) =>
  request(`/admin/uploads/${encodeURIComponent(filename)}`, { method: "DELETE" });

export function uploadFile(file) {
  const body = new FormData();
  body.append("file", file);
  return request("/admin/uploads", { method: "POST", body, isFormData: true });
}
