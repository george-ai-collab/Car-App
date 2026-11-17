import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "../theme";
import { fmtWhen } from "../lib/utils";
import { BottomSheet } from "./ui";
import { tr, locale } from "../lib/i18n";

// Our own date + time picker. The phone's built-in one was unreliable inside the app.
// Value is a local time string: "YYYY-MM-DDTHH:mm".

const pad = (n) => String(n).padStart(2, "0");
const toValue = (d, h24, m) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h24)}:${pad(m)}`;
// One-letter weekday names in the app language (Sunday first).
const DAYS = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale(), { weekday: "narrow" }));
const MINUTES = [0, 15, 30, 45];

function parse(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return { date: new Date(+m[1], +m[2] - 1, +m[3]), h: +m[4], min: +m[5] };
}

export function DateTimePicker({ value, onChange, placeholder = tr("Pick a date and time") }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="when-field" onClick={() => setOpen(true)} className="press" style={{
        width: "100%", padding: "11px 14px", borderRadius: 16, border: `1px solid ${T.lineDark}`, background: T.surface,
        color: value ? T.text : T.textDim, fontSize: 14.5, textAlign: "start", display: "flex", alignItems: "center", gap: 10,
      }}>
        <Calendar size={15} color={value ? T.accent : T.textDim} />
        {value ? fmtWhen(value) : placeholder}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={tr("When is it?")} maxHeight="88vh">
        {open && <PickerBody value={value} onDone={(v) => { onChange(v); setOpen(false); }} />}
      </BottomSheet>
    </>
  );
}

function PickerBody({ value, onDone }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parse(value);
  const [day, setDay] = useState(start?.date || null);
  const [month, setMonth] = useState(() => {
    const d = start?.date || today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const startH = start ? start.h : 19;
  const [hour12, setHour12] = useState(((startH + 11) % 12) + 1);
  const [pm, setPm] = useState(startH >= 12);
  const [minute, setMinute] = useState(start ? (MINUTES.includes(start.min) ? start.min : 0) : 0);

  const h24 = (hour12 % 12) + (pm ? 12 : 0);
  const chosen = day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), h24, minute) : null;
  const inPast = chosen && chosen.getTime() < Date.now();

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1);

  const chip = (on) => ({
    padding: "8px 0", borderRadius: 12, border: `1px solid ${on ? T.accent : T.lineDark}`,
    background: on ? T.accent : "transparent", color: on ? "#fff" : T.text, fontSize: 13.5, fontWeight: 600,
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button aria-label={tr("Previous month")} disabled={!canGoBack} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="press" style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 999, padding: 7, display: "flex", opacity: canGoBack ? 1 : 0.3 }}>
          <ChevronLeft size={16} color={T.text} />
        </button>
        <div data-testid="month-label" style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>
          {month.toLocaleDateString(locale(), { month: "long", year: "numeric" })}
        </div>
        <button aria-label={tr("Next month")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="press" style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 999, padding: 7, display: "flex" }}>
          <ChevronRight size={16} color={T.text} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 16 }}>
        {DAYS.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, color: T.textDim, padding: "2px 0" }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const past = d < today;
          const on = day && d.getTime() === day.getTime();
          const isToday = d.getTime() === today.getTime();
          return (
            <button key={i} data-day={d.getDate()} disabled={past} onClick={() => setDay(d)} className="press" style={{
              aspectRatio: "1", borderRadius: 999, border: isToday && !on ? `1px solid ${T.accent}` : "1px solid transparent",
              background: on ? T.accent : "transparent", color: past ? "rgba(245,244,242,0.22)" : on ? "#fff" : T.text,
              fontSize: 13.5, fontWeight: on ? 700 : 500, padding: 0,
            }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="plate" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 8 }}>{tr("Time")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
          <button key={h} data-hour={h} onClick={() => setHour12(h)} className="press" style={chip(hour12 === h)}>{h}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {MINUTES.map((m) => (
          <button key={m} data-minute={m} onClick={() => setMinute(m)} className="press" style={{ ...chip(minute === m), flex: 1 }}>:{pad(m)}</button>
        ))}
        <div style={{ width: 8 }} />
        {[["AM", false], ["PM", true]].map(([label, v]) => (
          <button key={label} onClick={() => setPm(v)} className="press" style={{ ...chip(pm === v), flex: 1 }}>{label}</button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: inPast ? T.accent : T.textDim, marginBottom: 10, minHeight: 18 }}>
        {!day ? tr("Pick a day") : inPast ? tr("That time has already passed") : fmtWhen(toValue(day, h24, minute))}
      </div>
      <button disabled={!day || inPast} onClick={() => onDone(toValue(day, h24, minute))} className="press" style={{
        width: "100%", padding: "13px 16px", borderRadius: 16, border: "none",
        background: day && !inPast ? T.accent : T.surface2, color: day && !inPast ? "#fff" : T.textDim, fontWeight: 600, fontSize: 15,
      }}>
        {tr("Done")}
      </button>
    </div>
  );
}
