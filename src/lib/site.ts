/** Public production origin for self-hosted / Vercel deploys. */
export const SITE_ORIGIN = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://edenrefinery.com"
).replace(/\/$/, "");

export const SITE_WWW_ORIGIN = "https://www.edenrefinery.com";
