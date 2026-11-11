// Fetches car news headlines from public RSS feeds into news_items.
// We only keep the headline, a short summary, the picture link and the link to the
// original article (people read the full story on the publisher's site).
// Runs at most every 3 hours, however often it is called. Old items (45+ days) are removed.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const EVERY_MS = 3 * 60 * 60 * 1000;
const KEEP_DAYS = 45;
type Feed = { url: string; source: string; category: "general" | "racing" | "gulf"; lang: "en" | "ar" };
const FEEDS: Feed[] = [
  { url: "https://www.carscoops.com/feed/", source: "Carscoops", category: "general", lang: "en" },
  { url: "https://www.motor1.com/rss/news/all/", source: "Motor1", category: "general", lang: "en" },
  { url: "https://www.autocar.co.uk/rss", source: "Autocar", category: "general", lang: "en" },
  { url: "https://www.thedrive.com/feed", source: "The Drive", category: "general", lang: "en" },
  { url: "https://www.caranddriver.com/rss/all.xml/", source: "Car and Driver", category: "general", lang: "en" },
  { url: "https://www.roadandtrack.com/rss/all.xml/", source: "Road & Track", category: "general", lang: "en" },
  { url: "https://www.autoevolution.com/rss/backend.xml", source: "autoevolution", category: "general", lang: "en" },
  { url: "https://www.motorsport.com/rss/all/news/", source: "Motorsport.com", category: "racing", lang: "en" },
  { url: "https://www.the-race.com/feed/", source: "The Race", category: "racing", lang: "en" },
  { url: "https://www.autosport.com/rss/feed/all", source: "Autosport", category: "racing", lang: "en" },
  { url: "https://www.formula1.com/en/latest/all.xml", source: "Formula 1", category: "racing", lang: "en" },
  { url: "https://www.autodrift.ae/feed/", source: "AutoDrift", category: "gulf", lang: "en" },
  { url: "https://www.arabgt.com/feed/", source: "ArabGT", category: "gulf", lang: "ar" },
];

const decode = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const strip = (s: string) => decode(decode(s)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
};
const attr = (block: string, re: RegExp) => { const m = block.match(re); return m ? decode(m[1]) : ""; };

async function hash(s: string) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readFeed(f: Feed) {
  const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CarfoolyNews/1.0)", Accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const xml = await r.text();
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  const out = [];
  for (const b of blocks.slice(0, 15)) {
    const title = strip(tag(b, "title"));
    let url = strip(tag(b, "link")) || attr(b, /<link[^>]*href="([^"]+)"/i);
    url = url.trim();
    if (!title || !/^https?:\/\//.test(url)) continue;
    const when = new Date(strip(tag(b, "pubDate")) || strip(tag(b, "published")) || strip(tag(b, "updated")) || strip(tag(b, "dc:date")));
    const desc = tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded") || tag(b, "content");
    const image = attr(b, /<media:content[^>]*url="([^"]+)"/i) || attr(b, /<media:thumbnail[^>]*url="([^"]+)"/i)
      || attr(b, /<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i) || attr(b, /<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/i)
      || attr(decode(desc), /<img[^>]*src="([^"]+)"/i) || attr(decode(tag(b, "content:encoded")), /<img[^>]*src="([^"]+)"/i) || null;
    let summary = strip(desc);
    if (summary.length > 220) summary = summary.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    out.push({
      id: await hash(url), url, title: title.slice(0, 300), source: f.source, summary,
      image: image && /^https:\/\//.test(image) ? image : null,
      category: f.category, lang: f.lang,
      published_at: isNaN(+when) ? new Date().toISOString() : when.toISOString(),
      fetched_at: new Date().toISOString(),
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { data: meta } = await db.from("news_meta").select("last_fetch").eq("id", 1).maybeSingle();
  if (meta && Date.now() - new Date(meta.last_fetch).getTime() < EVERY_MS) return reply(200, { fresh: true, last_fetch: meta.last_fetch });
  // Claim this run first so many phones opening News at once don't all fetch.
  await db.from("news_meta").upsert({ id: 1, last_fetch: new Date().toISOString() });
  const report: Record<string, number | string> = {};
  await Promise.all(FEEDS.map(async (f) => {
    try {
      const items = await readFeed(f);
      const seen = new Set<string>();
      const rows = items.filter((i) => !seen.has(i.url) && seen.add(i.url));
      // No picture in the feed: use the article's own share picture (og:image), for new items only.
      const { data: have } = await db.from("news_items").select("url").in("url", rows.map((r) => r.url));
      const old = new Set((have || []).map((r) => r.url));
      await Promise.all(rows.filter((r) => !r.image && !old.has(r.url)).slice(0, 10).map(async (r) => {
        try {
          const page = await fetch(r.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CarfoolyNews/1.0)" }, signal: AbortSignal.timeout(6000) });
          const html = (await page.text()).slice(0, 60000);
          const img = attr(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
          if (/^https:\/\//.test(img)) r.image = img;
        } catch { /* no picture then */ }
      }));
      if (rows.length) {
        const { error } = await db.from("news_items").upsert(rows, { onConflict: "url", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      report[f.source] = rows.length;
    } catch (e) { report[f.source] = "failed: " + String((e as Error).message || e).slice(0, 80); }
  }));
  await db.from("news_items").delete().lt("published_at", new Date(Date.now() - KEEP_DAYS * 864e5).toISOString());
  return reply(200, { fetched: report });
});
