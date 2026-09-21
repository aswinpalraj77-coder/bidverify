"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileStack, ShieldCheck, ShieldAlert, ShieldX, Upload, BadgeCheck } from "lucide-react";
import { Shell } from "../../../components/Shell";
import { Card, StatusBadge } from "../../../components/ui";
import { getAuth } from "../../../lib/auth";
import { getBidsForBidder } from "../../../lib/bids";

export default function BidderDashboard() {
  const router = useRouter();
  const [auth, setAuthState] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "bidder") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
    getBidsForBidder(a.email)
      .then(setBids)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (!auth) return null;

  const total = bids.length;
  const safe = bids.filter((b) => b.status === "SAFE").length;
  const moderate = bids.filter((b) => b.status === "MODERATE").length;
  const risk = bids.filter((b) => b.status === "RISK").length;

  const stat = (label, value, Icon, color) => (
    <Card style={{ padding: "18px 20px", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--slate)", fontWeight: 600 }}>{label}</div>
          <div className="serif" style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>{value}</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={17} color={color} />
        </div>
      </div>
    </Card>
  );

  return (
    <Shell role="bidder" user={auth.email} title="Dashboard" subtitle="Overview of your bid submissions and compliance status." crumbs={["Bidder Portal", "Dashboard"]}>
      <div className="fade-in" style={{ padding: 32, maxWidth: 1180 }}>
        {error && (
          <Card style={{ padding: 16, marginBottom: 20, background: "var(--risk-bg)", color: "var(--risk)", fontSize: 13 }}>
            Couldn&apos;t load bids from Supabase: {error}. Check your .env.local values and that the schema/seed SQL has been run.
          </Card>
        )}

        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {stat("Total Submissions", total, FileStack, "var(--teal)")}
          {stat("Safe", safe, ShieldCheck, "var(--safe)")}
          {stat("Moderate", moderate, ShieldAlert, "var(--moderate)")}
          {stat("Risk", risk, ShieldX, "var(--risk)")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recent Submissions</h3>
              <button onClick={() => router.push("/bidder/history")} className="btn" style={{ background: "none", color: "var(--teal)", fontSize: 12.5, fontWeight: 600 }}>
                View all →
              </button>
            </div>
            {loading && <div style={{ fontSize: 13, color: "var(--slate-light)", padding: "20px 0" }}>Loading…</div>}
            {!loading && bids.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--slate-light)", padding: "20px 0" }}>No submissions yet. Submit your first bid to see it here.</div>
            )}
            {bids.slice(0, 4).map((b) => (
              <div
                key={b.id}
                onClick={() => router.push(`/bidder/result/${b.id}`)}
                className="btn"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 4px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.tender_name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--slate-light)", marginTop: 2 }}>
                    {b.bid_ref} · {new Date(b.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--slate)" }}>{b.score}%</span>
                  <StatusBadge status={b.status} size="sm" />
                </div>
              </div>
            ))}
          </Card>

          <Card style={{ padding: 24 }}>
            <h3 className="serif" style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Ready to submit?</h3>
            <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, margin: "0 0 18px" }}>
              Upload your eligibility document and get real OCR extraction with automated compliance verification against live registry records.
            </p>
            <button
              onClick={() => router.push("/bidder/submit")}
              className="btn"
              style={{ width: "100%", background: "var(--navy)", color: "#fff", padding: "12px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            >
              <Upload size={15} /> Submit New Bid
            </button>
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--slate-light)", marginBottom: 10 }}>WHAT GETS CHECKED</div>
              {["Company Name", "PAN", "GSTIN", "Udyam / MSME Number", "CIN"].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--slate)", marginBottom: 7 }}>
                  <BadgeCheck size={13} color="var(--teal)" /> {f}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
