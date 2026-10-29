import { BarChart3, Eye, Users, ScanLine, Car, Clock, Repeat, Share2, TrendingUp, MapPin } from "lucide-react";
import { T } from "../theme";
import { Avatar, SectionLabel } from "../components/ui";
import { meetInsights, SOURCE_LABELS } from "../lib/meetInsights";
import { shareText } from "../lib/share";
import { tr, locale, AT } from "../lib/i18n";

const card = { background: T.surface, border: `1px solid ${T.lineDark}`, borderRadius: 20, padding: 14, marginBottom: 12 };
const fmtTime = (d) => d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
const fmtDay = (d) => d.toLocaleDateString(locale(), { weekday: "narrow" });

function Tile({ icon, value, label, sub, testid }) {
  return (
    <div data-testid={testid} style={{ padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.textDim, fontSize: 11.5 }}>{icon}{label}</div>
      <div className="plate" style={{ color: T.text, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Horizontal bars with a label and a number (sources, car makes).
function Bars({ rows, testid, color = T.accent }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div data-testid={testid} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.text, marginBottom: 4 }}>
            <span>{r.label}</span><span style={{ color: T.textDim }}>{r.n}{r.pct != null ? ` · ${r.pct}%` : ""}</span>
          </div>
          <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
            <div style={{ width: `${(r.n / max) * 100}%`, height: "100%", borderRadius: 99, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Vertical bars over time (RSVPs per day, arrivals per 15 minutes).
function Columns({ cols, testid, color = T.accent2 }) {
  const max = Math.max(1, ...cols.map((c) => c.n));
  return (
    <div data-testid={testid} dir="ltr" style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110 }}>
      {cols.map((c, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, color: c.n ? T.text : "transparent" }}>{c.n}</span>
          <div style={{ width: "100%", height: `${Math.max(3, (c.n / max) * 70)}px`, borderRadius: 5, background: c.n ? color : "rgba(255,255,255,0.07)" }} />
          <span style={{ fontSize: 9.5, color: T.textDim, whiteSpace: "nowrap" }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// Organizers only: everything about how the meet is doing, in one page.
export function MeetInsights({ meet, meets, cars, openProfile }) {
  const s = meetInsights(meet, { meets, cars });
  const summary = () => shareText({
    title: tr("{0}: insights", meet.title),
    text: [
      `${meet.title}`,
      tr("{0} views · {1} going · {2} checked in ({3}% showed up)", s.views, s.going, s.checkedIn, s.showUpRate),
      tr("{0} cars · {1} spots ({2} scanned)", s.cars, s.spots, s.scannedSpots),
      s.makes.length ? tr("Top makes: {0}", s.makes.slice(0, 3).map((m) => `${m.make} ${m.pct}%`).join(", ")) : "",
      s.peak ? tr("Busiest arrival time: {0}", fmtTime(s.peak.at)) : "",
      tr("{0} regulars, {1} new faces", s.regulars.length, s.newFaces),
    ].filter(Boolean).join("\n"),
  });

  return (
    <div data-testid="meet-insights" style={{ paddingTop: 18, paddingBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BarChart3 size={20} color={T.accent} />
        <div className="display" style={{ fontSize: 22, color: T.text, flex: 1 }}>{tr("Insights")}</div>
        <button data-testid="share-insights" onClick={summary} className="press" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.lineDark}`, background: "transparent", color: T.text, fontSize: 12.5, fontWeight: 700 }}>
          <Share2 size={13} /> {tr("Share summary")}
        </button>
      </div>
      <div style={{ color: T.textDim, fontSize: 12.5, margin: "4px 0 14px" }}>{meet.title} · {tr("Only organizers see this. Your own visits aren't counted.")}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <Tile testid="ins-views" icon={<Eye size={12} />} label={tr("People who opened it")} value={s.views} sub={s.views ? tr("{0}% said they're going", s.goingFromViews) : null} />
        <Tile testid="ins-going" icon={<Users size={12} />} label={tr("Going")} value={s.going} sub={tr("{0} driving · {1} attending", s.drivers, s.attending)} />
        <Tile testid="ins-checked" icon={<ScanLine size={12} />} label={tr("Checked in")} value={s.checkedIn} sub={s.going ? tr("{0}% of people going showed up", s.showUpRate) : null} />
        <Tile testid="ins-cars" icon={<Car size={12} />} label={tr("Cars there")} value={s.cars} sub={tr("{0} spots · {1} scanned", s.spots, s.scannedSpots)} />
      </div>

      <div style={card}>
        <SectionLabel><MapPin size={12} /> {tr("How people found it")}</SectionLabel>
        {s.sources.length ? <Bars testid="ins-sources" rows={s.sources.map((x) => ({ label: tr(SOURCE_LABELS[x.id] || "Other"), n: x.n, pct: x.pct }))} />
          : <div style={{ color: T.textDim, fontSize: 12.5 }}>{tr("No views yet. Share the meet's tag to get people in.")}</div>}
      </div>

      <div style={card}>
        <SectionLabel><TrendingUp size={12} /> {tr("New RSVPs, last 10 days")}</SectionLabel>
        <Columns testid="ins-rsvps" cols={s.rsvpDays.map((d) => ({ n: d.n, label: fmtDay(d.date) }))} />
      </div>

      <div style={card}>
        <SectionLabel><Clock size={12} /> {tr("When people arrived")}</SectionLabel>
        {s.arrivals.length ? (
          <>
            <Columns testid="ins-arrivals" color={T.accent} cols={s.arrivals.map((a) => ({ n: a.n, label: fmtTime(a.at) }))} />
            {s.peak && <div style={{ color: T.textDim, fontSize: 12, marginTop: 8 }}>{tr("Busiest: {0} ({1} people in 15 minutes)", fmtTime(s.peak.at), s.peak.n)}</div>}
          </>
        ) : <div style={{ color: T.textDim, fontSize: 12.5 }}>{tr("Check people in by scanning their tag, and arrival times show up here.")}</div>}
      </div>

      <div style={card}>
        <SectionLabel><Car size={12} /> {tr("Cars by make")}</SectionLabel>
        {s.makes.length ? <Bars testid="ins-makes" color={T.accentWarm} rows={s.makes.slice(0, 6).map((m) => ({ label: m.make, n: m.n, pct: m.pct }))} />
          : <div style={{ color: T.textDim, fontSize: 12.5 }}>{tr("Shows once drivers pick their car or people spot cars here.")}</div>}
        {s.mostSpotted && (
          <div data-testid="ins-most-spotted" style={{ color: T.text, fontSize: 12.5, marginTop: 10 }}>
            {tr("Most spotted: {0} ({1} spots)", `${s.mostSpotted.car.year} ${s.mostSpotted.car.make} ${s.mostSpotted.car.model}`, s.mostSpotted.n)}
          </div>
        )}
      </div>

      <div style={card}>
        <SectionLabel><Repeat size={12} /> {tr("Regulars")}</SectionLabel>
        <div data-testid="ins-regulars" style={{ color: T.text, fontSize: 13, marginBottom: s.regulars.length ? 10 : 0 }}>
          {s.earlierMeets
            ? tr("{0} of the people going came to your earlier meets · {1} new faces", s.regulars.length, s.newFaces)
            : tr("This is your first meet, so everyone is new. Regulars show up from your next one.")}
        </div>
        {s.regulars.slice(0, 8).map((r) => (
          <button key={r.username} onClick={() => openProfile(r.username)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "6px 0", background: "none", border: "none", textAlign: "start" }}>
            <Avatar username={r.username} size={28} />
            <span style={{ flex: 1, color: T.text, fontSize: 13, fontWeight: 600 }}>{AT}{r.username}</span>
            <span style={{ color: T.textDim, fontSize: 12 }}>{tr("{0} earlier meets", r.times)}</span>
          </button>
        ))}
      </div>

      <div style={{ color: T.textDim, fontSize: 11.5, textAlign: "center", lineHeight: 1.5 }}>
        {tr("All Pro tools are free while Carfooly is in beta.")}
      </div>
    </div>
  );
}
