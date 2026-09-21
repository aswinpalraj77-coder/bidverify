"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileStack, ShieldCheck, Clock, ShieldX, TrendingUp } from "lucide-react";
import { Shell } from "../../../components/Shell";
import { Card, StatusBadge, ScoreRing } from "../../../components/ui";
import { getAuth } from "../../../lib/auth";
import { getAllBids } from "../../../lib/bids";

export default function AdminDashboard() {
  const router = useRouter();
  const [auth, setAuthState] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "admin") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
    getAllBids().then(setBids).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [router]);

  if (!auth) return null;

  const total = bids.length;
  const safe = bids.filter((b) => b.status === "SAFE").length;
  const moderate = bids.filter((b) => b.status === "MODERATE").length;
  const risk = bids.filter((b) => b.status === "RISK").length;
  const avgScore = total ? Math.round(bids.reduce((s, b) => s + (b.score || 0), 0) / total) : 0;

  const stat = (label, value, Icon, color) => (
    <Card className="hover-lift" style={{ padding: "24px", flex: 1, borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--slate)", fontWeight: 600, letterSpacing: 0.2 }}>{label}</div>
          <div className="serif" style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 0", color: "var(--navy)", letterSpacing: "-0.02em" }}>{value}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </Card>
  );

  return (
    <Shell role="admin" user={auth.email} title="Overview Dashboard" subtitle="Compliance metrics across all bidder submissions." crumbs={["Admin Portal", "Dashboard"]}>
      <div className="fade-in" style={{ padding: 32, maxWidth: 1240 }}>
        {error && (
          <Card style={{ padding: 16, marginBottom: 24, background: "var(--risk-bg)", color: "var(--risk)", fontSize: 13.5, border: "1px solid rgba(220,38,38,0.2)" }}>
            Failed to load submissions: {error}
          </Card>
        )}

        <div style={{ display: "flex", gap: 20, marginBottom: 32 }}>
          {stat("Total Bids", total, FileStack, "var(--teal)")}
          {stat("Verified Safe", safe, ShieldCheck, "var(--safe)")}
          {stat("Pending Review", moderate, Clock, "var(--moderate)")}
          {stat("Risky Bids", risk, ShieldX, "var(--risk)")}
          {stat("Avg. Score", avgScore + "%", TrendingUp, "var(--navy)")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
          <Card style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Recent Submissions</h3>
              <button onClick={() => router.push("/admin/bids")} className="btn" style={{ background: "var(--teal-light)", padding: "6px 14px", borderRadius: 20, color: "var(--teal)", fontSize: 13, fontWeight: 600 }}>
                View all
              </button>
            </div>
            {loading && (
              <div style={{ padding: "20px 0" }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton-container" style={{ height: 60, borderRadius: 8, marginBottom: 12 }} />
                ))}
              </div>
            )}
            {!loading && bids.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--slate-light)", fontSize: 14 }}>
                No submissions yet.
              </div>
            )}
            {bids.slice(0, 6).map((b) => (
              <div
                key={b.id}
                onClick={() => router.push(`/admin/bids/${b.id}`)}
                className="btn"
                style={{ 
                  display: "flex", justifyContent: "space-between", alignItems: "center", 
                  padding: "16px 12px", borderBottom: "1px solid var(--border)", 
                  borderRadius: 8, transition: "background 0.2s" 
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "var(--bg)"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--navy)" }}>{b.company_name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 4 }}>
                    <span className="mono" style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>{b.bid_ref}</span>
                    <span style={{ margin: "0 8px", color: "var(--border)" }}>|</span> 
                    {b.tender_name.split("—")[0].trim()}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ScoreRing score={b.score || 0} size={48} />
                  <StatusBadge status={b.status} size="sm" />
                </div>
              </div>
            ))}
          </Card>

          <Card style={{ padding: 28, alignSelf: "start" }}>
            <h3 className="serif" style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Compliance Breakdown</h3>
            {[
              ["Safe", safe, "var(--safe)"],
              ["Moderate", moderate, "var(--moderate)"],
              ["Risk", risk, "var(--risk)"],
            ].map(([label, count, color]) => {
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)" }}>{label}</span>
                    <span style={{ color: "var(--slate)" }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 10, background: "var(--bg)", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 5, transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 32, padding: 16, background: "var(--bg)", borderRadius: 8, fontSize: 12.5, color: "var(--slate)", lineHeight: 1.5, border: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 600, color: "var(--navy)", display: "block", marginBottom: 4 }}>Live Cross-checks</span>
              Registry verifications run live against PAN, GSTIN, Udyam/MSME, and CIN databases on Supabase.
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
