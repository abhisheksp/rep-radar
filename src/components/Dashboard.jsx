import { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { estimateNRM, estimate1RM } from "../utils/epley.js";

// ─── COLORS & STYLES ────────────────────────────────────────────────────────
const COLORS = {
  bg: "#0a0e17",
  card: "#111827",
  cardBorder: "#1e293b",
  accent: "#f59e0b",
  accentDim: "rgba(245, 158, 11, 0.15)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#475569",
  green: "#10b981",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  orange: "#f97316",
};

const REP_COLORS = {
  1: "#ef4444",
  2: "#f97316",
  3: "#f59e0b",
  4: "#84cc16",
  5: "#10b981",
  6: "#06b6d4",
  7: "#3b82f6",
  8: "#6366f1",
  10: "#a855f7",
  12: "#ec4899",
  14: "#f43f5e",
  16: "#fb923c",
};

const getRepColor = (rep) => REP_COLORS[rep] || COLORS.textMuted;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const parseDate = (d) => {
  const [m, day, y] = d.split("/");
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
};

const formatDate = (d) => {
  const date = typeof d === "string" ? parseDate(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatDateFull = (d) => {
  const date = typeof d === "string" ? parseDate(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── PROCESS DATA ────────────────────────────────────────────────────────────
const PRIORITY_LIFTS = [
  "Deadlift",
  "Bench Press",
  "Back Squat",
  "Push Press",
  "Shoulder Press",
];

function processEntries(rawEntries) {
  const liftMap = {};
  rawEntries.forEach((entry) => {
    if (!liftMap[entry.lift]) liftMap[entry.lift] = [];
    liftMap[entry.lift].push({
      ...entry,
      dateObj: parseDate(entry.date),
      timestamp: parseDate(entry.date).getTime(),
      est1RM: estimate1RM(entry.maxLoad, entry.reps),
    });
  });

  Object.keys(liftMap).forEach((lift) => {
    liftMap[lift].sort((a, b) => a.timestamp - b.timestamp);
  });

  const liftRepOptions = {};
  Object.keys(liftMap).forEach((lift) => {
    const reps = [...new Set(liftMap[lift].map((e) => e.reps))].sort(
      (a, b) => a - b
    );
    liftRepOptions[lift] = reps;
  });

  const liftNames = [
    ...PRIORITY_LIFTS.filter((l) => liftMap[l]),
    ...Object.keys(liftMap)
      .filter((l) => !PRIORITY_LIFTS.includes(l))
      .sort(),
  ];

  return { liftMap, liftRepOptions, liftNames };
}

// ─── CONSOLIDATE SAME-DAY ENTRIES ────────────────────────────────────────────
const consolidateSameDay = (entries, targetReps) => {
  const byDate = {};
  entries.forEach((e) => {
    const normalized = estimateNRM(e.maxLoad, e.reps, targetReps);
    const entry = {
      ...e,
      normalized,
      isExact: e.reps === targetReps,
      dateLabel: formatDate(e.date),
    };
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(entry);
  });

  return Object.entries(byDate).map(([, dayEntries]) => {
    const best = dayEntries.reduce((a, b) =>
      a.normalized > b.normalized ? a : b
    );
    const anyPR = dayEntries.some((e) => e.isPR);
    return { ...best, isPR: anyPR, allEntries: dayEntries, mergedCount: dayEntries.length };
  });
};

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, targetReps }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const allEntries = data.allEntries || [data];
  const isMerged = allEntries.length > 1;

  return (
    <div
      style={{
        background: "rgba(17, 24, 39, 0.97)",
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        maxWidth: 320,
      }}
    >
      <div
        style={{
          color: COLORS.accent,
          fontWeight: 700,
          fontSize: 13,
          marginBottom: 6,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {formatDateFull(data.date)}
        {isMerged && (
          <span
            style={{
              color: COLORS.cyan,
              fontWeight: 400,
              fontSize: 10,
              marginLeft: 8,
            }}
          >
            {allEntries.length} workouts merged
          </span>
        )}
      </div>

      {allEntries.map((entry, i) => (
        <div
          key={i}
          style={{
            borderTop: i > 0 ? `1px solid rgba(255,255,255,0.06)` : "none",
            paddingTop: i > 0 ? 8 : 0,
            marginTop: i > 0 ? 8 : 0,
          }}
        >
          <div
            style={{
              color: COLORS.text,
              fontSize: 12,
              marginBottom: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {entry.title}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
              Actual
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: getRepColor(entry.reps),
              }}
            >
              {entry.maxLoad} lbs × {entry.reps}R
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
              {entry.reps === targetReps
                ? `Actual ${targetReps}RM`
                : `Est. ${targetReps}RM`}
            </span>
            <span
              style={{
                color:
                  entry.reps === targetReps ? COLORS.green : COLORS.accent,
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {entry.normalized} lbs
              {entry.reps !== targetReps && (
                <span
                  style={{
                    color: COLORS.textDim,
                    fontSize: 9,
                    marginLeft: 4,
                  }}
                >
                  ~Epley
                </span>
              )}
            </span>
          </div>
          {entry.isPR && (
            <div style={{ color: COLORS.accent, fontSize: 10, fontWeight: 700 }}>
              🏆 PR
            </div>
          )}
          {entry.notes && (
            <div
              style={{
                color: COLORS.textDim,
                fontSize: 10,
                fontStyle: "italic",
                marginTop: 2,
              }}
            >
              {entry.notes}
            </div>
          )}
        </div>
      ))}

      {isMerged && (
        <div
          style={{
            color: COLORS.cyan,
            fontSize: 10,
            marginTop: 8,
            paddingTop: 6,
            borderTop: `1px solid rgba(255,255,255,0.06)`,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ▲ Plotted: best est. {targetReps}RM = {data.normalized} lbs
        </div>
      )}
    </div>
  );
};

// ─── LIFT CHART ───────────────────────────────────────────────────────────────
const LiftChart = ({ entries, targetReps, compact = false }) => {
  if (!entries || entries.length === 0) return null;
  const chartData = consolidateSameDay(entries, targetReps);
  const maxVal = Math.max(...chartData.map((d) => d.normalized));
  const minVal = Math.min(...chartData.map((d) => d.normalized));
  const padding = Math.max(10, (maxVal - minVal) * 0.15);
  const liftName = entries[0]?.lift || "lift";
  const height = compact ? 220 : 320;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart
          data={chartData}
          margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
        >
          <defs>
            <linearGradient id={`grad-${liftName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.25} />
              <stop
                offset="100%"
                stopColor={COLORS.accent}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="dateLabel"
            tick={{
              fill: COLORS.textDim,
              fontSize: compact ? 9 : 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            axisLine={{ stroke: COLORS.cardBorder }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[
              Math.max(0, Math.floor(minVal - padding)),
              Math.ceil(maxVal + padding),
            ]}
            tick={{
              fill: COLORS.textDim,
              fontSize: compact ? 9 : 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            axisLine={{ stroke: COLORS.cardBorder }}
            tickLine={false}
            unit=" lb"
          />
          <Tooltip content={<CustomTooltip targetReps={targetReps} />} />
          <Area
            type="monotone"
            dataKey="normalized"
            fill={`url(#grad-${liftName})`}
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="normalized"
            stroke={COLORS.accent}
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const isExact = payload.isExact;
              const isPR = payload.isPR;
              const r = isPR ? 7 : 5;
              const color = getRepColor(payload.reps);
              return (
                <g key={`${cx}-${cy}`}>
                  {isPR && (
                    <text
                      x={cx}
                      y={cy - r - 6}
                      textAnchor="middle"
                      fill={COLORS.accent}
                      fontSize={compact ? 11 : 13}
                      fontWeight="bold"
                    >
                      ★
                    </text>
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={isExact ? color : COLORS.card}
                    stroke={color}
                    strokeWidth={isExact ? 0 : 2.5}
                  />
                  {!isExact && (
                    <line
                      x1={cx - 2.5}
                      y1={cy - 2.5}
                      x2={cx + 2.5}
                      y2={cy + 2.5}
                      stroke={color}
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
            }}
            activeDot={{ r: 8, fill: COLORS.accent, stroke: COLORS.bg, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── LIFT PANEL ───────────────────────────────────────────────────────────────
const LiftPanel = ({ liftName, entries, repOptions, compact = false }) => {
  const [selectedRep, setSelectedRep] = useState(repOptions?.[0] || 1);
  if (!entries || entries.length === 0) return null;

  const best1RM = Math.max(...entries.map((e) => e.est1RM));
  const prCount = entries.filter((e) => e.isPR).length;
  const allRepOptions = [...new Set([1, 2, 3, 5, ...repOptions])].sort(
    (a, b) => a - b
  );

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 16,
        padding: compact ? 16 : 20,
        marginBottom: compact ? 12 : 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: compact ? 10 : 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <h3
            style={{
              color: COLORS.text,
              margin: 0,
              fontSize: compact ? 16 : 20,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {liftName}
          </h3>
          <div
            style={{
              color: COLORS.textMuted,
              fontSize: 11,
              marginTop: 2,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {entries.length} session{entries.length > 1 ? "s" : ""} ·{" "}
            {prCount} PR{prCount !== 1 ? "s" : ""} · Est. 1RM:{" "}
            <span style={{ color: COLORS.green, fontWeight: 700 }}>
              {best1RM} lbs
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {allRepOptions.map((rep) => (
            <button
              key={rep}
              onClick={() => setSelectedRep(rep)}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: `1px solid ${
                  selectedRep === rep ? COLORS.accent : COLORS.cardBorder
                }`,
                background:
                  selectedRep === rep ? COLORS.accentDim : "transparent",
                color:
                  selectedRep === rep ? COLORS.accent : COLORS.textMuted,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {rep}RM
            </button>
          ))}
        </div>
      </div>

      <LiftChart
        entries={entries}
        targetReps={selectedRep}
        compact={compact}
      />

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "8px 0",
          borderTop: `1px solid ${COLORS.cardBorder}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width={14} height={14}>
            <circle cx={7} cy={7} r={5} fill={COLORS.accent} />
          </svg>
          <span
            style={{
              color: COLORS.textMuted,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Actual {selectedRep}RM
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width={14} height={14}>
            <circle
              cx={7}
              cy={7}
              r={5}
              fill="none"
              stroke={COLORS.textMuted}
              strokeWidth={2}
            />
            <line
              x1={4.5}
              y1={4.5}
              x2={9.5}
              y2={9.5}
              stroke={COLORS.textMuted}
              strokeWidth={1.5}
            />
          </svg>
          <span
            style={{
              color: COLORS.textMuted,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Extrapolated
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: COLORS.accent }}>★</span>
          <span
            style={{
              color: COLORS.textMuted,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            PR
          </span>
        </div>
        {repOptions.map((rep) => (
          <div key={rep} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: getRepColor(rep),
              }}
            />
            <span
              style={{
                color: COLORS.textMuted,
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {rep}R
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = COLORS.accent }) => (
  <div
    style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 12,
      padding: "14px 16px",
      flex: "1 1 140px",
      minWidth: 120,
    }}
  >
    <div
      style={{
        color: COLORS.textMuted,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {label}
    </div>
    <div
      style={{
        color,
        fontSize: 22,
        fontWeight: 800,
        marginTop: 4,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          color: COLORS.textDim,
          fontSize: 10,
          marginTop: 2,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
/**
 * @param {object} props
 * @param {Array} props.entries  - LiftEntry[] from an adapter
 * @param {function} props.onReset - called when user wants to upload a new file
 */
export default function Dashboard({ entries, onReset }) {
  const [view, setView] = useState("summary");
  const { liftMap, liftRepOptions, liftNames } = processEntries(entries);
  const [selectedLift, setSelectedLift] = useState(liftNames[0]);

  const totalSessions = entries.length;
  const totalPRs = entries.filter((e) => e.isPR).length;
  const uniqueLifts = liftNames.length;

  const sorted = [...entries].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date)
  );
  const dateRange =
    sorted.length >= 2
      ? `${formatDateFull(sorted[0].date)} – ${formatDateFull(sorted[sorted.length - 1].date)}`
      : sorted.length === 1
      ? formatDateFull(sorted[0].date)
      : "";

  const bestLifts = liftNames
    .map((name) => {
      const best = Math.max(...liftMap[name].map((e) => e.est1RM));
      return { name, best };
    })
    .sort((a, b) => b.best - a.best);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)",
          borderBottom: `1px solid ${COLORS.cardBorder}`,
          padding: "24px 20px 20px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.orange})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                🏋️
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    background: `linear-gradient(135deg, ${COLORS.text}, ${COLORS.accent})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Rep Radar
                </h1>
                <div
                  style={{
                    color: COLORS.textDim,
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {dateRange}
                </div>
              </div>
            </div>

            <button
              onClick={onReset}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${COLORS.cardBorder}`,
                background: "transparent",
                color: COLORS.textMuted,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "nowrap",
              }}
            >
              ↑ New file
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {["summary", "detail"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 10,
                  border: `1px solid ${
                    view === v ? COLORS.accent : COLORS.cardBorder
                  }`,
                  background:
                    view === v ? COLORS.accentDim : "transparent",
                  color: view === v ? COLORS.accent : COLORS.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: "all 0.15s",
                }}
              >
                {v === "summary" ? "📊 All Lifts" : "🔍 Single Lift"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px" }}>
        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <StatCard
            label="Lift Sessions"
            value={totalSessions}
            sub="tracked workouts"
          />
          <StatCard
            label="Personal Records"
            value={totalPRs}
            sub="PRs hit"
            color={COLORS.green}
          />
          <StatCard
            label="Unique Lifts"
            value={uniqueLifts}
            sub="different movements"
            color={COLORS.blue}
          />
          <StatCard
            label="Top Est. 1RM"
            value={`${bestLifts[0]?.best} lb`}
            sub={bestLifts[0]?.name}
            color="#a855f7"
          />
        </div>

        {view === "summary" ? (
          <div>
            <div
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                marginBottom: 16,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              All {uniqueLifts} lifts · RM buttons normalize view · Same-day
              entries merged (best est. plotted) · Hover for full details
            </div>
            {liftNames.map((name) => (
              <LiftPanel
                key={name}
                liftName={name}
                entries={liftMap[name]}
                repOptions={liftRepOptions[name]}
                compact={true}
              />
            ))}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  color: COLORS.textMuted,
                  fontSize: 11,
                  display: "block",
                  marginBottom: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                SELECT LIFT
              </label>
              <select
                value={selectedLift}
                onChange={(e) => setSelectedLift(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: 400,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.cardBorder}`,
                  background: COLORS.card,
                  color: COLORS.text,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                }}
              >
                {liftNames.map((name) => (
                  <option key={name} value={name}>
                    {name} ({liftMap[name].length} sessions)
                  </option>
                ))}
              </select>
            </div>

            {selectedLift && liftMap[selectedLift] && (
              <>
                <LiftPanel
                  liftName={selectedLift}
                  entries={liftMap[selectedLift]}
                  repOptions={liftRepOptions[selectedLift]}
                  compact={false}
                />

                {/* Session History Table */}
                <div
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.cardBorder}`,
                    borderRadius: 16,
                    padding: 20,
                    marginTop: 20,
                  }}
                >
                  <h3
                    style={{
                      color: COLORS.text,
                      margin: "0 0 14px",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    Session History
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: `1px solid ${COLORS.cardBorder}`,
                          }}
                        >
                          {[
                            "Date",
                            "Workout",
                            "Reps",
                            "Max Load",
                            "Est. 1RM",
                            "Sets",
                            "PR",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: "left",
                                padding: "8px 10px",
                                color: COLORS.textDim,
                                fontWeight: 600,
                                fontSize: 10,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {liftMap[selectedLift].map((entry, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: `1px solid rgba(255,255,255,0.03)`,
                            }}
                          >
                            <td
                              style={{
                                padding: "8px 10px",
                                color: COLORS.textMuted,
                              }}
                            >
                              {formatDateFull(entry.date)}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                color: COLORS.text,
                                fontWeight: 500,
                              }}
                            >
                              {entry.title}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <span
                                style={{
                                  background: getRepColor(entry.reps),
                                  color: "#fff",
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                {entry.reps}RM
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                color: COLORS.text,
                                fontWeight: 700,
                              }}
                            >
                              {entry.maxLoad} lbs
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                color: COLORS.green,
                                fontWeight: 700,
                              }}
                            >
                              {entry.est1RM} lbs
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                color: COLORS.textDim,
                                fontSize: 10,
                              }}
                            >
                              [{entry.setLoads.join(", ")}]
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              {entry.isPR && (
                                <span style={{ color: COLORS.accent }}>
                                  🏆
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px",
          color: COLORS.textDim,
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          borderTop: `1px solid ${COLORS.cardBorder}`,
          marginTop: 40,
        }}
      >
        Epley formula: 1RM = w × (1 + r/30) · Filled dot = actual RM · Hollow
        + slash = extrapolated · Same-day entries consolidated (best est.)
      </div>
    </div>
  );
}
