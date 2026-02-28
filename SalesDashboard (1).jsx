import { useState, useMemo, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const MONTHLY_GOAL = 100000;
const CURRENT_CASH = 30000;
const DAYS_IN_MONTH = 28;
const CURRENT_DAY = 9;

const fmt$ = v => v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
const fmtN = v => v.toLocaleString();

const BG      = "#060606";
const CARD    = "#0d0d0d";
const BORDER  = "#141414";
const BORDER2 = "#1e1e1e";
const WHITE   = "#F1F5F9";
const LABEL   = "#888";
const SUB     = "#666";
const DIM     = "#333";
const MED     = "#999";
const ACCENT  = "#F97316";
const AMBER   = "#FBBF24";
const GREEN   = "#22D3A5";
const RED     = "#F43F5E";

const TODAY = new Date(2026, 1, 26);
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function sameDay(a, b) { return a && b && a.toDateString() === b.toDateString(); }
function monthKey(d) { return `target:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function isCurrentMonth(d) { return d.getFullYear() === TODAY.getFullYear() && d.getMonth() === TODAY.getMonth(); }
function dateStr(d) { if (!d) return ""; return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }

function getRangeLabel(s, e) {
  if (!s) return "Select range";
  if (!e || sameDay(s, e)) return dateStr(s);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) return `${SHORT_MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
  if (s.getFullYear() === e.getFullYear()) return `${SHORT_MONTHS[s.getMonth()]} ${s.getDate()} – ${SHORT_MONTHS[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
  return `${dateStr(s)} – ${dateStr(e)}`;
}

function getPreset(label) {
  if (label === "Today") return { start: TODAY, end: TODAY };
  if (label === "This Week") { const day = TODAY.getDay(); const diff = day === 0 ? 6 : day - 1; return { start: addDays(TODAY, -diff), end: TODAY }; }
  if (label === "This Month") return { start: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), end: TODAY };
  if (label === "Last 7D") return { start: addDays(TODAY, -6), end: TODAY };
  if (label === "Last 30D") return { start: addDays(TODAY, -29), end: TODAY };
  if (label === "Last 90D") return { start: addDays(TODAY, -89), end: TODAY };
  if (label === "Last 6M") return { start: addMonths(TODAY, -6), end: TODAY };
  if (label === "Last 12M") return { start: addMonths(TODAY, -12), end: TODAY };
  if (label === "All Time") return { start: new Date(2024, 0, 1), end: TODAY };
}

function presetActive(label, startDate, endDate) {
  const p = getPreset(label);
  if (!p || !startDate || !endDate) return false;
  return sameDay(p.start, startDate) && sameDay(p.end, endDate);
}

function genRand(seed, base, variance, i) {
  return Math.max(0, Math.round(base + Math.sin(seed * 0.0001 + i * 3.7 + base) * variance));
}

function generateData(start, end) {
  if (!start || !end) return { chart: [], totals: {}, prev: {} };
  const days = Math.round((end - start) / 86400000) + 1;
  const seed = start.getTime();
  const rand = (b, v, i) => genRand(seed, b, v, i);
  const prevSeed = addDays(start, -days).getTime();
  const prand = (b, v, i) => genRand(prevSeed, b, v, i);
  const bucket = days <= 14 ? "day" : days <= 60 ? "week" : "month";
  let chart = [];
  if (bucket === "day") {
    chart = Array.from({ length: days }, (_, i) => {
      const d = addDays(start, i);
      const ob = rand(55, 15, i), cv = Math.round(ob * 0.32), ca = Math.round(cv * 0.38), sh = Math.round(ca * 0.7), cl = Math.round(sh * 0.55);
      return { label: `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`, cash: cl * 3000, calls: ca, closes: cl, shows: sh, convos: cv, outbounds: ob, followups: rand(8, 3, i), hours: rand(7, 2, i) };
    });
  } else if (bucket === "week") {
    const weeks = Math.ceil(days / 7);
    chart = Array.from({ length: weeks }, (_, i) => {
      const ws = addDays(start, i * 7);
      const ob = rand(280, 60, i), cv = Math.round(ob * 0.32), ca = Math.round(cv * 0.38), sh = Math.round(ca * 0.7), cl = Math.round(sh * 0.55);
      return { label: `${SHORT_MONTHS[ws.getMonth()]} ${ws.getDate()}`, cash: cl * 3000, calls: ca, closes: cl, shows: sh, convos: cv, outbounds: ob, followups: rand(35, 10, i), hours: rand(40, 8, i) };
    });
  } else {
    let cur = new Date(start.getFullYear(), start.getMonth(), 1), i = 0;
    while (cur <= end) {
      const ob = rand(1100, 200, i), cv = Math.round(ob * 0.32), ca = Math.round(cv * 0.38), sh = Math.round(ca * 0.7), cl = Math.round(sh * 0.55);
      chart.push({ label: `${SHORT_MONTHS[cur.getMonth()]} '${cur.getFullYear().toString().slice(2)}`, cash: cl * 3000, calls: ca, closes: cl, shows: sh, convos: cv, outbounds: ob, followups: rand(140, 30, i), hours: rand(160, 20, i) });
      cur = addMonths(cur, 1); i++;
    }
  }
  const s = arr => arr.reduce((a, r) => a + r, 0);
  const totals = {
    cash: s(chart.map(r => r.cash)), calls: s(chart.map(r => r.calls)), closes: s(chart.map(r => r.closes)),
    shows: s(chart.map(r => r.shows)), outbounds: s(chart.map(r => r.outbounds)), convos: s(chart.map(r => r.convos)),
    followups: s(chart.map(r => r.followups)), hours: s(chart.map(r => r.hours)),
  };
  totals.closeRate = ((totals.closes / (totals.shows || 1)) * 100).toFixed(1);
  totals.showRate = ((totals.shows / (totals.calls || 1)) * 100).toFixed(1);
  totals.aov = Math.round(totals.cash / (totals.closes || 1));
  totals.callToBook = ((totals.calls / (totals.convos || 1)) * 100).toFixed(1);
  totals.pitched = Math.round(totals.calls * 0.85);
  totals.inbounds = Math.round(totals.outbounds * 0.08);
  const pOb = prand(1100, 200, 0) * Math.ceil(days / 30);
  const pCv = Math.round(pOb * 0.32), pCa = Math.round(pCv * 0.38), pSh = Math.round(pCa * 0.7), pCl = Math.round(pSh * 0.55);
  const prev = {
    cash: pCl * 3000, calls: pCa, closes: pCl, shows: pSh, outbounds: Math.round(pOb), convos: pCv,
    followups: Math.round(prand(140, 30, 1) * Math.ceil(days / 30)), hours: Math.round(prand(160, 20, 2) * Math.ceil(days / 30)),
    closeRate: ((pCl / (pSh || 1)) * 100).toFixed(1), showRate: ((pSh / (pCa || 1)) * 100).toFixed(1),
    aov: Math.round((pCl * 3000) / (pCl || 1)), callToBook: ((pCa / (pCv || 1)) * 100).toFixed(1),
    pitched: Math.round(pCa * 0.85), inbounds: Math.round(Math.round(pOb) * 0.08),
  };
  return { chart, totals, prev };
}

function calcDelta(curr, prev) {
  if (!prev || prev === 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  return { pct: Math.abs(pct).toFixed(1), up: pct >= 0 };
}
function calcRateDelta(curr, prev) {
  const d = parseFloat(curr) - parseFloat(prev);
  if (Math.abs(d) < 0.1) return null;
  return { pct: Math.abs(d).toFixed(1), up: d >= 0, isRate: true };
}

function DeltaBadge({ delta }) {
  if (!delta) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: delta.up ? GREEN : RED, background: delta.up ? "rgba(34,211,165,0.1)" : "rgba(244,63,94,0.1)", borderRadius: 4, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 2 }} title="vs previous period">
      {delta.up ? "▲" : "▼"} {delta.pct}{delta.isRate ? "pp" : "%"}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0a0a0a", border: `1px solid ${BORDER2}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
      <div style={{ color: LABEL, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < payload.length - 1 ? 7 : 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: MED, fontSize: 11 }}>{p.name}</span>
          <span style={{ color: WHITE, fontSize: 13, fontWeight: 700, marginLeft: "auto", paddingLeft: 24 }}>{p.name === "Cash" ? fmt$(p.value) : fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function MetricCard({ title, value, sub, delta }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: CARD, borderRadius: 14, padding: "20px 22px", flex: 1, minWidth: 148,
        border: `1px solid ${hovered ? BORDER2 : BORDER}`,
        position: "relative", overflow: "hidden", cursor: "default",
        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.7)" : "none",
      }}
    >
      {hovered && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#F97316,#FBBF24)" }} />}
      <div style={{ fontSize: 10, color: LABEL, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: WHITE, letterSpacing: -1, marginBottom: 8, lineHeight: 1 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        {sub && <div style={{ fontSize: 11, color: SUB, lineHeight: 1.4 }}>{sub}</div>}
        <DeltaBadge delta={delta} />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 6 }}>
      <div style={{ fontSize: 9, color: SUB, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

function GoalCard({ current, goal, delta, onEdit, isEditable, monthLabel }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(goal));
  const pct = Math.min((current / goal) * 100, 100);
  const projected = Math.round((current / CURRENT_DAY) * DAYS_IN_MONTH);
  const onTrack = projected >= goal;

  const handleSave = () => {
    const val = parseInt(input.replace(/[^0-9]/g, ""));
    if (val > 0) onEdit(val);
    setEditing(false);
  };

  return (
    <div style={{ background: CARD, borderRadius: 14, padding: "24px 26px", border: `1px solid ${BORDER}`, marginBottom: 16, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#F97316,#FBBF24,#22D3A5)", opacity: 0.6 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: LABEL, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}>
              {monthLabel} Target
            </div>
            {isEditable && !editing && (
              <button onClick={() => { setInput(String(goal)); setEditing(true); }}
                style={{ background: "none", border: `1px solid ${BORDER2}`, color: SUB, borderRadius: 5, padding: "2px 8px", fontSize: 9, cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Edit</button>
            )}

          </div>
          {editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, color: SUB, fontWeight: 700 }}>$</span>
              <input
                autoFocus
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                style={{ background: "#111", border: `1px solid ${ACCENT}`, borderRadius: 8, padding: "6px 12px", color: WHITE, fontSize: 24, fontWeight: 800, width: 160, outline: "none" }}
              />
              <button onClick={handleSave} style={{ background: ACCENT, border: "none", borderRadius: 8, padding: "7px 14px", color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${BORDER2}`, borderRadius: 8, padding: "7px 12px", color: SUB, fontSize: 11, cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 38, fontWeight: 800, color: WHITE, letterSpacing: -2, lineHeight: 1 }}>{fmt$(current)}</span>
              <span style={{ fontSize: 15, color: SUB }}>/ {fmt$(goal)}</span>
              {delta && <DeltaBadge delta={delta} />}
            </div>
          )}
        </div>
        {!editing && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 34, fontWeight: 800, background: "linear-gradient(135deg,#F97316,#FBBF24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1, lineHeight: 1 }}>{pct.toFixed(0)}%</div>
            <div style={{ fontSize: 10, color: SUB, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>of target</div>
          </div>
        )}
      </div>
      <div style={{ background: "#111", borderRadius: 99, height: 5, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? GREEN : "linear-gradient(90deg,#F97316,#FBBF24)", borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 0 8px rgba(249,115,22,0.4)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: SUB }}><span style={{ color: MED, fontWeight: 600 }}>{fmt$(goal - current)}</span> remaining</span>
        <span style={{ fontSize: 12, color: SUB }}>Projected: <span style={{ color: onTrack ? GREEN : ACCENT, fontWeight: 700 }}>{fmt$(projected)}</span></span>
      </div>
    </div>
  );
}

function MiniCal({ viewDate, setViewDate, startDate, endDate, hover, setHover, onSelect }) {
  const yr = viewDate.getFullYear(), mo = viewDate.getMonth();
  // Start week on Monday: shift so Mon=0
  const rawFirst = new Date(yr, mo, 1).getDay();
  const first = (rawFirst + 6) % 7;
  const total = new Date(yr, mo + 1, 0).getDate();
  const canGoNext = addMonths(viewDate, 1) <= TODAY;
  const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => new Date(yr, mo, i + 1))];
  return (
    <div style={{ width: 224 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setViewDate(addMonths(viewDate, -1))}
          style={{ background: BORDER, border: "none", color: MED, cursor: "pointer", fontSize: 14, padding: "4px 9px", borderRadius: 6, lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 12, color: WHITE, fontWeight: 700, letterSpacing: 0.2 }}>{MONTH_NAMES[mo]} {yr}</span>
        <button onClick={() => canGoNext && setViewDate(addMonths(viewDate, 1))}
          style={{ background: canGoNext ? BORDER : "transparent", border: "none", color: canGoNext ? MED : DIM, cursor: canGoNext ? "pointer" : "default", fontSize: 14, padding: "4px 9px", borderRadius: 6, lineHeight: 1 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 6 }}>
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, color: SUB, fontWeight: 700, letterSpacing: 0.5 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px 0" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const future = d > TODAY;
          const isSt = sameDay(d, startDate), isEn = sameDay(d, endDate);
          const eff = endDate || hover;
          const inRange = startDate && eff && d > (startDate < eff ? startDate : eff) && d < (startDate < eff ? eff : startDate);
          const sel = isSt || isEn;
          const isToday = sameDay(d, TODAY);
          return (
            <button key={i} onClick={() => !future && onSelect(d)} onMouseEnter={() => !future && setHover(d)}
              style={{
                background: sel ? WHITE : inRange ? BORDER2 : "none",
                color: sel ? "#000" : future ? DIM : inRange ? MED : isToday ? ACCENT : MED,
                border: "none",
                borderRadius: 6,
                padding: "6px 0",
                fontSize: 11,
                cursor: future ? "default" : "pointer",
                textAlign: "center",
                fontWeight: sel ? 800 : isToday ? 700 : 400,
                transition: "background 0.1s",
              }}>{d.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({ startDate, endDate, onChange, onClose }) {
  const [selecting, setSelecting] = useState("start");
  const [hover, setHover] = useState(null);
  const [viewDate, setViewDate] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));

  const handleSelect = d => {
    if (selecting === "start") { onChange({ start: d, end: null }); setSelecting("end"); }
    else { const s = startDate; onChange(s <= d ? { start: s, end: d } : { start: d, end: s }); setSelecting("start"); onClose(); }
  };

  const topPresets = ["Today", "This Week", "This Month"];
  const botPresets = ["Last 7D", "Last 30D", "Last 90D"];
  const allPresets = [...topPresets, ...botPresets];

  const activePreset = allPresets.find(p => {
    const r = getPreset(p); if (!r || !startDate || !endDate) return false;
    return sameDay(r.start, startDate) && sameDay(r.end, endDate);
  });

  return (
    <div style={{ display: "flex", padding: "16px 18px 18px", gap: 18 }}>
      {/* Left: presets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 110 }}>
        <div style={{ fontSize: 9, color: DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, paddingLeft: 2 }}>Select Date</div>
        {topPresets.map(p => {
          const active = activePreset === p;
          return (
            <button key={p} onClick={() => { onChange(getPreset(p)); onClose(); }}
              style={{ background: active ? BORDER2 : "none", border: `1px solid ${active ? BORDER2 : "transparent"}`, color: active ? WHITE : MED, borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.12s", whiteSpace: "nowrap" }}>{p}</button>
          );
        })}
        <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />
        {botPresets.map(p => {
          const active = activePreset === p;
          return (
            <button key={p} onClick={() => { onChange(getPreset(p)); onClose(); }}
              style={{ background: active ? BORDER2 : "none", border: `1px solid ${active ? BORDER2 : "transparent"}`, color: active ? WHITE : SUB, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.12s", whiteSpace: "nowrap" }}>{p}</button>
          );
        })}

      </div>
      {/* Divider */}
      <div style={{ width: 1, background: BORDER, flexShrink: 0 }} />
      {/* Calendar */}
      <div onMouseLeave={() => setHover(null)}>
        <MiniCal viewDate={viewDate} setViewDate={setViewDate} startDate={startDate} endDate={endDate} hover={hover} setHover={setHover} onSelect={handleSelect} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [page, setPage] = useState("overview");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [endDate, setEndDate] = useState(TODAY);
  const [targets, setTargets] = useState({});
  const [clientName, setClientName] = useState("Client");
  const [editingClient, setEditingClient] = useState(false);
  const [clientInput, setClientInput] = useState("");
  const pickerRef = useRef();

  const { chart, totals: t, prev } = useMemo(() => generateData(startDate, endDate), [startDate, endDate]);
  const rangeLabel = getRangeLabel(startDate, endDate);

  // Load saved targets + client name from storage
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("monthly-targets");
        if (result) setTargets(JSON.parse(result.value));
        const cn = await window.storage.get("client-name");
        if (cn) setClientName(cn.value);
      } catch (e) {}
    })();
  }, []);

  // Determine which month the current view is for
  const viewMonth = startDate || TODAY;
  const key = monthKey(viewMonth);
  const activeGoal = targets[key] || MONTHLY_GOAL;
  const editable = isCurrentMonth(viewMonth);
  const mLabel = MONTH_NAMES[viewMonth.getMonth()];

  const handleEditTarget = async (val) => {
    const updated = { ...targets, [key]: val };
    setTargets(updated);
    try { await window.storage.set("monthly-targets", JSON.stringify(updated)); } catch (e) {}
  };

  // Auto-refresh every hour
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const h = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const tick = { fill: SUB, fontSize: 10 };
  const grid = { stroke: "#111", strokeDasharray: "3 3" };

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "-apple-system,'Inter',sans-serif", color: WHITE, padding: "26px 30px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.8 }}>Sales Dashboard</div>
          <div style={{ fontSize: 10, color: SUB, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 5, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <span>ML Consulting ×</span>
            {editingClient ? (
              <input
                autoFocus
                value={clientInput}
                onChange={e => setClientInput(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === "Enter") {
                    setClientName(clientInput);
                    try { await window.storage.set("client-name", clientInput); } catch (e) {}
                    setEditingClient(false);
                  }
                  if (e.key === "Escape") setEditingClient(false);
                }}
                onBlur={async () => {
                  setClientName(clientInput);
                  try { await window.storage.set("client-name", clientInput); } catch (e) {}
                  setEditingClient(false);
                }}
                style={{ background: "none", border: "none", borderBottom: `1px solid ${BORDER2}`, color: SUB, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 600, outline: "none", width: 120 }}
              />
            ) : (
              <span onClick={() => { setClientInput(clientName); setEditingClient(true); }}
                style={{ cursor: "text", borderBottom: `1px solid transparent` }}>{clientName}</span>
            )}
          </div>
        </div>
        <div style={{ position: "relative" }} ref={pickerRef}>
          <button onClick={() => setPickerOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, background: pickerOpen ? "#111" : CARD, border: `1px solid ${pickerOpen ? BORDER2 : BORDER}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: WHITE, fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="11" rx="2" stroke="#444" strokeWidth="1.4"/><path d="M5 1.5v3M11 1.5v3M1.5 7.5h13" stroke="#444" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(() => {
                const presets = ["Today", "This Week", "This Month", "Last 7D", "Last 30D", "Last 90D"];
                const match = presets.find(p => { const r = getPreset(p); return r && startDate && endDate && sameDay(r.start, startDate) && sameDay(r.end, endDate); });
                return match || rangeLabel;
              })()}
            </span>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ transform: pickerOpen ? "rotate(180deg)" : "none", transition: "0.2s", flexShrink: 0 }}><path d="M2 3.5L5 6.5L8 3.5" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {pickerOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 200, background: CARD, border: `1px solid ${BORDER2}`, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", minWidth: 470 }}>
              <DateRangePicker startDate={startDate} endDate={endDate} onChange={({ start, end }) => { setStartDate(start); setEndDate(end || null); }} onClose={() => setPickerOpen(false)} />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, marginBottom: 20, gap: 2 }}>
        {[["overview","Overview"],["activity","Activity"]].map(([key, name]) => (
          <button key={key} onClick={() => setPage(key)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: page === key ? WHITE : LABEL, padding: "9px 18px", borderBottom: page === key ? `2px solid ${WHITE}` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s", textTransform: "uppercase", letterSpacing: 1.5 }}>{name}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {page === "overview" && (
        <>
          <GoalCard current={CURRENT_CASH} goal={activeGoal} delta={calcDelta(CURRENT_CASH, prev.cash)} onEdit={handleEditTarget} isEditable={editable} monthLabel={mLabel} />
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <MetricCard title="Calls Booked (Qualified)" value={fmtN(t.calls)} sub={`Qualified calls booked`} delta={calcDelta(t.calls, prev.calls)} />
            <MetricCard title="Show Rate" value={`${t.showRate}%`} sub={`${t.shows} of ${t.calls} showed up`} delta={calcRateDelta(t.showRate, prev.showRate)} />
            <MetricCard title="Close Rate" value={`${t.closeRate}%`} sub={`${t.closes} of ${t.shows} calls closed`} delta={calcRateDelta(t.closeRate, prev.closeRate)} />
            <MetricCard title="Avg Order Value" value={fmt$(t.aov)} delta={calcDelta(t.aov, prev.aov)} />
          </div>
          <div style={{ background: CARD, borderRadius: 14, padding: "20px 22px", border: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: LABEL, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>Performance Overview</div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["Cash", ACCENT],["Calls", MED],["Closes", SUB]].map(([n, c]) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 14, height: 2, background: c, borderRadius: 99 }} />
                    <span style={{ fontSize: 10, color: LABEL }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chart}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="cash" tickFormatter={fmt$} tick={tick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="count" orientation="right" tick={tick} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: BORDER2, strokeWidth: 1 }} />
                <Line yAxisId="cash" type="monotone" dataKey="cash" name="Cash" stroke={ACCENT} strokeWidth={2} dot={false} />
                <Line yAxisId="count" type="monotone" dataKey="calls" name="Calls" stroke={MED} strokeWidth={1.5} dot={false} />
                <Line yAxisId="count" type="monotone" dataKey="closes" name="Closes" stroke={SUB} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ACTIVITY */}
      {page === "activity" && (
        <>
          <SectionLabel>Outreach</SectionLabel>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <MetricCard title="Outbounds" value={fmtN(t.outbounds)} sub="Total outbound messages" delta={calcDelta(t.outbounds, prev.outbounds)} />
            <MetricCard title="Follow-Ups" value={fmtN(t.followups)} sub="Total follow-ups sent" delta={calcDelta(t.followups, prev.followups)} />
            <MetricCard title="Conversations" value={fmtN(t.convos)} sub="Active conversations" delta={calcDelta(t.convos, prev.convos)} />
          </div>

          <SectionLabel>Calls</SectionLabel>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <MetricCard title="Calls Pitched" value={fmtN(t.pitched)} sub="Total calls proposed" delta={calcDelta(t.pitched, prev.pitched)} />
            <MetricCard title="Calls Booked" value={fmtN(t.calls)} sub="Total calls booked" delta={calcDelta(t.calls, prev.calls)} />
            <MetricCard title="Calls Booked (Qualified)" value={fmtN(Math.round(t.calls * 0.72))} sub="Total qualified calls booked" delta={calcDelta(Math.round(t.calls * 0.72), Math.round(prev.calls * 0.72))} />
          </div>

          <SectionLabel>Other</SectionLabel>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <MetricCard title="Inbounds Received" value={fmtN(t.inbounds)} sub="Inbound leads received" delta={calcDelta(t.inbounds, prev.inbounds)} />
            <MetricCard title="Convo to Book Rate" value={`${t.callToBook}%`} sub={`${t.calls} of ${t.convos} convos`} delta={calcRateDelta(t.callToBook, prev.callToBook)} />
            <MetricCard title="Hours Worked" value={`${t.hours}h`} delta={calcDelta(t.hours, prev.hours)} />
          </div>

          <div style={{ background: CARD, borderRadius: 14, padding: "20px 22px", border: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: LABEL, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>Activity Breakdown</div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["Outbounds", WHITE],["Convos", MED],["Booked", SUB]].map(([n, c]) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 14, height: 2, background: c, borderRadius: 99 }} />
                    <span style={{ fontSize: 10, color: LABEL }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chart}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: BORDER2, strokeWidth: 1 }} />
                <Line type="monotone" dataKey="outbounds" name="Outbounds" stroke={WHITE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="convos" name="Convos" stroke={MED} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="calls" name="Booked" stroke={SUB} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

    </div>
  );
}
