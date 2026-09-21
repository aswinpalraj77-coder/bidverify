"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Shell } from "../../../components/Shell";
import { Card, StatusBadge } from "../../../components/ui";
import { getAuth } from "../../../lib/auth";
import { getBidsForBidder } from "../../../lib/bids";

export default function BidHistoryPage() {
  const router = useRouter();
  const [auth, setAuthState] = useState(null);
  const [bids, setBids] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "bidder") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
    getBidsForBidder(a.email).then(setBids).finally(() => setLoading(false));
  }, [router]);

  if (!auth) return null;

  const filtered = filter === "ALL" ? bids : bids.filter((b) => b.status === filter);

  return (
    <Shell role="bidder" user={auth.email} title="Bid History" subtitle="All submissions and their verification outcomes." crumbs={["Bidder Portal", "Bid History"]}>
      <div className="fade-in" style={{ padding: 32, maxWidth: 1080 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {["ALL", "SAFE", "MODERATE", "RISK"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="btn"
              style={{
                padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                border: "1px solid " + (filter === f ? "var(--navy)" : "var(--border)"),
                background: filter === f ? "var(--navy)" : "#fff", color: filter === f ? "#fff" : "var(--slate)",
              }}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <Card style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr 0.6fr 0.7fr auto", padding: "12px 20px", fontSize: 10.5, fontWeight: 700, color: "var(--slate-light)", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
            <div>TENDER</div>
            <div>BID ID</div>
            <div>SUBMITTED</div>
            <div>SCORE</div>
            <div>STATUS</div>
            <div></div>
          </div>
          {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--slate-light)", fontSize: 13 }}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--slate-light)", fontSize: 13 }}>No submissions in this category yet.</div>
          )}
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/bidder/result/${b.id}`)}
              className="btn"
              style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr 0.6fr 0.7fr auto", padding: "14px 20px", borderBottom: "1px solid var(--border)", alignItems: "center", fontSize: 13 }}
            >
              <div style={{ fontWeight: 600 }}>{b.tender_name}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--slate)" }}>{b.bid_ref}</div>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>{new Date(b.created_at).toLocaleDateString()}</div>
              <div className="mono" style={{ fontWeight: 700 }}>{b.score}%</div>
              <div><StatusBadge status={b.status} size="sm" /></div>
              <Eye size={15} color="var(--slate-light)" />
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}
