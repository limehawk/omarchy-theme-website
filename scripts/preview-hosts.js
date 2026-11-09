// Theme preview images may only come from GitHub. A server the author runs could
// send the scraper one image and visitors another, or log who looked.
export function isAllowedPreviewUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return u.hostname === "raw.githubusercontent.com"
      || (u.hostname === "github.com" && u.pathname.startsWith("/user-attachments/assets/"));
  } catch {
    return false;
  }
}
