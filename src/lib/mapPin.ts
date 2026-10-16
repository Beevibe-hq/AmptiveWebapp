/*
 * The circle inside a host's map pin: their photo, over a fallback that shows when there is
 * no photo or it fails to load. Without the fallback the pin was an empty white bubble.
 *
 * Returned as an HTML string because Leaflet divIcons take HTML; everything interpolated is
 * escaped, since a quote in a URL or name would otherwise break out of the markup.
 */

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PERSON_GLYPH = `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>`;

/**
 * Fill for the pin's circle: the host's initial (or a person glyph when there's no name) on a
 * dark disc, with the photo layered on top. Place it inside a `position: relative` container.
 */
export function hostPinContent(avatarUrl?: string | null, hostName?: string | null): string {
  const initial = (hostName || '').trim().charAt(0).toUpperCase();
  const fallback = `
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#111111;color:#ffffff;font:700 18px/1 system-ui,-apple-system,sans-serif;">
      ${initial ? escapeHtml(initial) : PERSON_GLYPH}
    </div>`;
  const photo = avatarUrl
    ? `<img src="${escapeHtml(String(avatarUrl))}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.remove();" />`
    : '';
  return fallback + photo;
}
