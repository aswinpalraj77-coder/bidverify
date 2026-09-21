"use client";

import { ShieldCheck, ShieldAlert, ShieldX, Clock, CheckCircle2, XCircle } from "lucide-react";

export const StatusBadge = ({ status, size = "md" }) => {
  const map = {
    SAFE: { color: "var(--safe)", bg: "var(--safe-bg)", Icon: ShieldCheck, label: "Safe" },
    MODERATE: { color: "var(--moderate)", bg: "var(--moderate-bg)", Icon: ShieldAlert, label: "Moderate" },
    RISK: { color: "var(--risk)", bg: "var(--risk-bg)", Icon: ShieldX, label: "Risk" },
    PENDING: { color: "var(--slate)", bg: "#f1f5f9", Icon: Clock, label: "Pending" },
  };
  const s = map[status] || map.PENDING;
  const pad = size === "sm" ? "4px 10px" : "6px 14px";
  const fs = size === "sm" ? 11.5 : 13;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: s.bg,
        color: s.color,
        padding: pad,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
        border: `1px solid ${s.color}20` // 20 is hex for 12% opacity
      }}
    >
      <s.Icon size={size === "sm" ? 13 : 15} strokeWidth={2.4} />
      {s.label}
    </span>
  );
};

export const Card = ({ children, style, ...rest }) => (
  <div
    style={{ 
      background: "var(--paper)", 
      border: "1px solid var(--border)", 
      borderRadius: 16, 
      boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      ...style 
    }}
    {...rest}
  >
    {children}
  </div>
);

export const ScoreRing = ({ score, size = 108 }) => {
  const color = score >= 750 ? "var(--safe)" : score >= 500 ? "var(--moderate)" : "var(--risk)";
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (score - 300) / 600));
  const offset = c - (pct * c);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.05))" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f1f5f9" strokeWidth={10} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={10}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="serif" style={{ fontSize: size * 0.28, fontWeight: 700, color, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 11, color: "var(--slate-light)", fontWeight: 600, marginTop: 4 }}>/ 900</span>
      </div>
    </div>
  );
};

export const FieldCompareRow = ({ check }) => {
  const isMatch = check.status === 'PASS';
  const isWarning = check.status === 'WARNING';
  const isFail = check.status === 'FAIL' || check.status === 'NOT FOUND';
  
  let statusColor = "var(--slate)";
  let statusBg = "#f8fafc";
  if (isMatch) { statusColor = "var(--safe)"; statusBg = "var(--safe-bg)"; }
  else if (isWarning) { statusColor = "var(--moderate)"; statusBg = "var(--moderate-bg)"; }
  else if (isFail) { statusColor = "var(--risk)"; statusBg = "var(--risk-bg)"; }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr auto",
        gap: 16,
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
        alignItems: "center",
        transition: "background 0.2s ease",
      }}
      onMouseOver={(e) => e.currentTarget.style.background = "var(--bg)"}
      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", display: 'flex', alignItems: 'center', gap: '6px' }}>
          {check.field_name || check.field}
          {check.is_xai && <span style={{ fontSize: 10, background: 'var(--teal-light)', color: 'var(--teal)', padding: '2px 6px', borderRadius: 4 }}>AI</span>}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--slate-light)", marginTop: 4, lineHeight: 1.4 }}>{check.explanation || check.detail}</div>
      </div>
      <div className="mono" style={{ fontSize: 12.5, color: "var(--navy-soft)", wordBreak: "break-word", padding: "8px 12px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
        {check.extracted_value || check.extracted || "—"}
      </div>
      <div
        className="mono"
        style={{ fontSize: 12.5, wordBreak: "break-word", color: isMatch ? "var(--slate)" : "var(--risk)", padding: "8px 12px", background: isMatch ? "#f8fafc" : "var(--risk-bg)", borderRadius: 6, border: `1px solid ${isMatch ? '#e2e8f0' : 'rgba(220,38,38,0.2)'}` }}
      >
        {check.expected_value || check.dbValue}
      </div>
      <div>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: statusColor, fontSize: 12.5, fontWeight: 600, padding: "6px 12px", background: statusBg, borderRadius: 20 }}>
          {isMatch ? <CheckCircle2 size={16} /> : isWarning ? <ShieldAlert size={16} /> : <XCircle size={16} />}
          {check.status || (check.match ? 'PASS' : 'FAIL')}
        </span>
      </div>
    </div>
  );
};
