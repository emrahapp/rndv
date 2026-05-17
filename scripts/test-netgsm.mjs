/**
 * Netgsm credentials sanity check.
 *
 *  - Step 1: GET /balance — kontrol et: creds doğru mu, IP yetkili mi.
 *  - Step 2 (opsiyonel, --send-test ile): TEST_PHONE numarasına 1 SMS yolla.
 *
 * Usage:
 *   node scripts/test-netgsm.mjs              # sadece balance kontrolü
 *   TEST_PHONE=905XXXXXXXXX node scripts/test-netgsm.mjs --send-test
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal dotenv: parse .env.local without depending on dotenv package
const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const username = env.NETGSM_USERNAME;
const password = env.NETGSM_PASSWORD;
const msgheader = env.NETGSM_HEADER;

if (!username || !password || !msgheader) {
  console.error("✗ .env.local'de NETGSM_USERNAME / PASSWORD / HEADER eksik.");
  process.exit(1);
}

const auth = Buffer.from(`${username}:${password}`).toString("base64");

// ─── Step 1: balance check (free, tests creds + IP whitelist) ───
console.log("→ Balance check (GET)...");
{
  const url = new URL("https://api.netgsm.com.tr/balance/list/get");
  url.searchParams.set("usercode", username);
  url.searchParams.set("password", password);
  url.searchParams.set("stip", "1"); // 1 = paket bazlı, 2 = ücret bazlı
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  console.log(`  HTTP ${res.status}: "${text.trim().slice(0, 200)}"`);

  const code = text.trim().split(/\s+/)[0];
  if (code === "30") {
    console.error("✗ kullanıcı adı veya şifre hatalı (kod 30)");
    process.exit(1);
  }
  if (code === "40") {
    console.error("✗ msgheader yetkisiz (kod 40)");
  }
  if (code === "60") {
    console.error("✗ kullanıcı bulunamadı (kod 60)");
    process.exit(1);
  }
}

// ─── Step 2 (opsiyonel): gerçek test SMS gönder ───
if (process.argv.includes("--send-test")) {
  const to = process.env.TEST_PHONE;
  if (!to) {
    console.error("✗ TEST_PHONE env değişkeni ayarlı değil");
    process.exit(1);
  }
  const digits = to.replace(/\D/g, "");
  const gsmno = digits.startsWith("90") ? digits : `90${digits}`;

  console.log(`→ Test SMS → ${gsmno}`);
  const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      msgheader,
      encoding: "TR",
      iysfilter: "0",
      messages: [
        {
          msg: "rndv test SMS — Netgsm entegrasyonu çalışıyor. ğüşçöı ✓",
          no: gsmno,
        },
      ],
    }),
  });
  const text = await res.text();
  console.log(`  HTTP ${res.status}: ${text.slice(0, 300)}`);
}

console.log("\n✓ Bitti.");
