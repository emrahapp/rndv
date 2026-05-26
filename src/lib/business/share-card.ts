import QRCode from "qrcode";

const FG = "#0a0a0a";
const BG = "#ffffff";
const ACCENT = "#00d66f";
const MUTED = "#6b7280";

/** Strip the outer <svg ...> tag wrapper from a QRCode SVG, returning just the
 * inner markup so it can be re-positioned inside a parent <svg>. */
function unwrapSvg(full: string): { inner: string; viewBox: string } {
  // qrcode emits: <?xml ...><svg xmlns=... viewBox="0 0 N N" ...><path .../></svg>
  const m = full.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
  if (!m) return { inner: full, viewBox: "0 0 1 1" };
  return { viewBox: m[1], inner: m[2] };
}

export async function buildQrSvg(
  url: string,
  size = 320,
): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: { dark: FG, light: BG },
  });
}

/**
 * 1080×1920 Instagram-story / WhatsApp-status share card.
 * Returns a self-contained SVG string.
 */
export async function buildShareCardSvg(opts: {
  businessName: string;
  publicUrl: string;
  bookingLabel: string; // "Online randevu" / "Book online"
  footerLabel: string; // "rndv ile çalışıyor" / "powered by rndv"
}): Promise<string> {
  const qrFull = await QRCode.toString(opts.publicUrl, {
    type: "svg",
    errorCorrectionLevel: "Q",
    margin: 0,
    color: { dark: FG, light: BG },
  });
  const { inner: qrInner, viewBox: qrViewBox } = unwrapSvg(qrFull);

  const displayUrl = opts.publicUrl.replace(/^https?:\/\//, "");

  // Cap business name to 18 chars to avoid overflow on the card
  const name =
    opts.businessName.length > 18
      ? opts.businessName.slice(0, 18) + "…"
      : opts.businessName;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
  <rect width="1080" height="1920" fill="${BG}"/>

  <!-- rndv brand badge -->
  <g transform="translate(540, 220)">
    <rect x="-86" y="-32" width="172" height="64" rx="32" fill="${ACCENT}"/>
    <text x="0" y="8" text-anchor="middle" font-size="32" font-weight="600" fill="${FG}">rndv</text>
  </g>

  <!-- Subtitle -->
  <text x="540" y="370" text-anchor="middle" font-size="36" font-weight="400" fill="${MUTED}">
    ${escapeXml(opts.bookingLabel)}
  </text>

  <!-- Business name -->
  <text x="540" y="470" text-anchor="middle" font-size="80" font-weight="700" letter-spacing="-2" fill="${FG}">
    ${escapeXml(name)}
  </text>

  <!-- QR code -->
  <g transform="translate(190, 600)">
    <rect x="-20" y="-20" width="740" height="740" rx="32" fill="${BG}" stroke="${FG}" stroke-opacity="0.08" stroke-width="2"/>
    <svg x="0" y="0" width="700" height="700" viewBox="${qrViewBox}">
      ${qrInner}
    </svg>
  </g>

  <!-- URL -->
  <text x="540" y="1500" text-anchor="middle" font-size="46" font-weight="600" fill="${FG}">
    ${escapeXml(displayUrl)}
  </text>

  <!-- Hint -->
  <text x="540" y="1580" text-anchor="middle" font-size="32" font-weight="400" fill="${MUTED}">
    Kameranı QR kodla aç → randevu al
  </text>

  <!-- Footer -->
  <text x="540" y="1800" text-anchor="middle" font-size="28" font-weight="400" fill="${MUTED}">
    ${escapeXml(opts.footerLabel)}
  </text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
