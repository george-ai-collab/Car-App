// A chart drawn as smooth threads instead of bars and grids: the current line in colour,
// and (optionally) the previous one as a soft grey thread behind it, to compare.
// Use it for anything over time: RSVPs before a meet, a car's power after each mod, and so on.
import { useId } from "react";
import { T } from "../theme";

// A smooth curve through the points (Catmull-Rom turned into Bézier curves).
function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// values: numbers (current). previous: numbers (optional, same length or shorter). labels: under the line.
export function ThreadChart({ values, previous, labels = [], height = 120, color = T.accent, testid, legend }) {
  const id = useId().replace(/:/g, "");
  const W = 320, H = height, pad = 10;
  const all = [...values, ...(previous || [])];
  const max = Math.max(1, ...all), min = 0;
  const n = Math.max(values.length, previous?.length || 0);
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, n - 1);
  const y = (v) => H - 18 - ((v - min) / (max - min)) * (H - 34);
  const cur = values.map((v, i) => [x(i), y(v)]);
  const prev = (previous || []).map((v, i) => [x(i), y(v)]);
  const last = cur[cur.length - 1];
  return (
    <div data-testid={testid} dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`g${id}`} x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="3.5" /></filter>
        </defs>
        {prev.length > 1 && <path data-testid="thread-previous" d={smooth(prev)} fill="none" stroke="rgba(243,240,234,0.22)" strokeWidth="2" strokeLinecap="round" />}
        {cur.length > 1 && (
          <>
            <path d={`${smooth(cur)} L${last[0]},${H - 18} L${cur[0][0]},${H - 18} Z`} fill={`url(#f${id})`} />
            <path d={smooth(cur)} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.35" filter={`url(#g${id})`} />
            <path data-testid="thread-current" d={smooth(cur)} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"
              style={{ strokeDasharray: 1200, strokeDashoffset: 1200, animation: "threadDraw 1.2s cubic-bezier(.2,.8,.2,1) forwards" }} />
            <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke={T.bg} strokeWidth="2" />
            <text x={last[0]} y={last[1] - 10} textAnchor="end" fontSize="11" fontWeight="700" fill={T.text}>{values[values.length - 1]}</text>
          </>
        )}
        {labels.map((l, i) => (i === 0 || i === labels.length - 1 || i === Math.floor((labels.length - 1) / 2)) && (
          <text key={i} x={x(i)} y={H - 2} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} fontSize="9.5" fill={T.textDim}>{l}</text>
        ))}
      </svg>
      {legend && (
        <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11, color: T.textDim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 2.5, borderRadius: 2, background: color }} />{legend[0]}</span>
          {prev.length > 1 && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 2.5, borderRadius: 2, background: "rgba(243,240,234,0.3)" }} />{legend[1]}</span>}
        </div>
      )}
    </div>
  );
}
