"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye } from "lucide-react";
import { Shell } from "../../../components/Shell";
import { Card, StatusBadge } from "../../../components/ui";
import { getAuth } from "../../../lib/auth";
import { getAllBids } from "../../../lib/bids";

export default function AdminBidsPage() {
  const router = useRouter();
  const [auth, setAuthState] = useState(null);
  const [bids, setBids] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "admin") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
    getAllBids().then(setBids).finally(() => setLoading(false));
  }, [router]);

  if (!auth) return null;

  const filtered = bids.filter(
    (b) =>
      (filter === "ALL" || b.status === filter) &&
      ((b.company_name || "").toLowerCase().includes(query.toLowerCase()) || b.bid_ref.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <Shell role="admin" user={auth.email} title="All Bids" subtitle="Review and manage every submission received." crumbs={["Admin Portal", "All Bids"]}>
      <div className="fade-in" style={{ padding: 32, maxWidth: 1200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
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
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: 10, color: "var(--slate-light)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company or bid ID…"
              style={{ padding: "8px 12px 8px 32px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, width: 240, fontFamily: "inherit" }}
            />
          </div>
        </div>

        <Card style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.3fr 0.9fr 0.6fr 0.7fr auto", padding: "12px 20px", fontSize: 10.5, fontWeight: 700, color: "var(--slate-light)", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
            <div>COMPANY</div>
            <div>TENDER</div>
            <div>SUBMITTED</div>
            <div>SCORE</div>
            <div>STATUS</div>
            <div></div>
          </div>
          {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--slate-light)", fontSize: 13 }}>Loading…</div>}
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/admin/bids/${b.id}`)}
              className="btn"
              style={{ display: "grid", gridTemplateColumns: "1.4fr 1.3fr 0.9fr 0.6fr 0.7fr auto", padding: "14px 20px", borderBottom: "1px solid var(--border)", alignItems: "center", fontSize: 13 }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{b.company_name}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--slate-light)" }}>{b.bid_ref}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>{b.tender_name.split("—")[0].trim()}</div>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>{new Date(b.created_at).toLocaleDateString()}</div>
              <div className="mono" style={{ fontWeight: 700 }}>{b.score}%</div>
              <div><StatusBadge status={b.status} size="sm" /></div>
              <Eye size={15} color="var(--slate-light)" />
            </div>
          ))}
          {!loading && filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--slate-light)", fontSize: 13 }}>No bids match your filters.</div>}
        </Card>
      </div>
    </Shell>
  );
}
