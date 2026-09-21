"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "../../../components/Shell";
import { Card } from "../../../components/ui";
import { getAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabaseClient";

const TABLES = {
  pan_records: { label: "PAN Records", cols: ["pan", "legal_name", "status"] },
  gst_records: { label: "GST Records", cols: ["gstin", "legal_name", "state", "status"] },
  udyam_records: { label: "Udyam / MSME Records", cols: ["udyam_number", "legal_name", "category"] },
  cin_records: { label: "CIN Records", cols: ["cin", "legal_name", "incorporation_date"] },
};

const COL_LABEL = {
  pan: "PAN", legal_name: "Legal Name", status: "Status", gstin: "GSTIN", state: "State",
  udyam_number: "Udyam Number", category: "Category", cin: "CIN", incorporation_date: "Incorporated",
};

export default function AdminRegistryPage() {
  const router = useRouter();
  const [auth, setAuthState] = useState(null);
  const [tab, setTab] = useState("pan_records");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "admin") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
  }, [router]);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    setError("");
    supabase
      .from(tab)
      .select("*")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data || []);
      })
      .finally(() => setLoading(false));
  }, [auth, tab]);

  if (!auth) return null;

  return (
    <Shell role="admin" user={auth.email} title="Verification Registry" subtitle="Reference data used to cross-check every submission." crumbs={["Admin Portal", "Verification Registry"]}>
      <div className="fade-in" style={{ padding: 32, maxWidth: 1100 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {Object.entries(TABLES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="btn"
              style={{
                padding: "8px 15px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                border: "1px solid " + (tab === key ? "var(--navy)" : "var(--border)"),
                background: tab === key ? "var(--navy)" : "#fff", color: tab === key ? "#fff" : "var(--slate)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <Card style={{ padding: 16, marginBottom: 16, background: "var(--risk-bg)", color: "var(--risk)", fontSize: 13 }}>
            Couldn&apos;t read {tab} from Supabase: {error}. Confirm the schema SQL has been run and RLS policies allow public select.
          </Card>
        )}

        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Supabase table: <span className="mono" style={{ color: "var(--teal)" }}>{tab}</span>
            </div>
            <span style={{ fontSize: 11.5, color: "var(--slate-light)" }}>{loading ? "Loading…" : `${rows.length} records`}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${TABLES[tab].cols.length}, 1fr)`, padding: "10px 20px", fontSize: 10.5, fontWeight: 700, color: "var(--slate-light)", background: "var(--bg)" }}>
            {TABLES[tab].cols.map((c) => (
              <div key={c}>{COL_LABEL[c].toUpperCase()}</div>
            ))}
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${TABLES[tab].cols.length}, 1fr)`, padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
              {TABLES[tab].cols.map((c) => (
                <div
                  key={c}
                  className={c !== "legal_name" ? "mono" : ""}
                  style={{ color: c === "status" && row[c] !== "Active" ? "var(--risk)" : "var(--navy)", fontWeight: c === "legal_name" ? 600 : 400 }}
                >
                  {row[c]}
                </div>
              ))}
            </div>
          ))}
        </Card>
        <p style={{ fontSize: 11.5, color: "var(--slate-light)", marginTop: 14, lineHeight: 1.6 }}>
          This is live data read directly from your Supabase project. Every bid submission is cross-checked against these tables in real time.
        </p>
      </div>
    </Shell>
  );
}
