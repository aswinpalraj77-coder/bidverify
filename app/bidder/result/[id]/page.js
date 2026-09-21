"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Shell } from "../../../../components/Shell";
import { Card, StatusBadge, ScoreRing, FieldCompareRow } from "../../../../components/ui";
import { getAuth } from "../../../../lib/auth";
import { getBidById } from "../../../../lib/bids";

const RECS = {
  SAFE: [
    "All key identifiers matched registry records — proceed to technical evaluation.",
    "No further manual document verification required for this submission.",
  ],
  MODERATE: [
    "Request the bidder to re-upload a clearer copy of mismatched documents for manual review.",
    "Cross-verify flagged fields directly with the issuing registry before shortlisting.",
    "Hold final eligibility decision pending clarification from the bidder.",
  ],
  RISK: [
    "Do not proceed to technical evaluation until discrepancies are resolved.",
    "Flag this submission for manual compliance officer review.",
    "Request certified original documents from the bidder for re-verification.",
  ],
};

export default function BidderResultPage() {
  const router = useRouter();
  const params = useParams();
  const [auth, setAuthState] = useState(null);
  const [bid, setBid] = useState(null);
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "bidder") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
    getBidById(params.id)
      .then(({ bid, checks }) => {
        setBid(bid);
        setChecks(
          checks.map((c) => ({
            field_name: c.field_name || c.field,
            extracted_value: c.extracted_value || c.extracted,
            expected_value: c.expected_value || c.dbValue,
            status: c.status,
            match: c.status === 'PASS' || c.match,
            explanation: c.explanation || c.detail,
            bbox: c.bbox,
            is_xai: c.is_xai || (!["Company Name", "PAN Number", "GSTIN", "CIN", "Udyam / MSME Number", "EPFO Code", "Blacklist Status", "IT Returns", "Local Content %", "Make in India Class"].includes(c.field_name || c.field))
          }))
        );
      })
      .catch((e) => setError(e.message));
  }, [router, params.id]);

  if (!auth) return null;
  if (error) {
    return (
      <Shell role="bidder" user={auth.email} title="Verification Result" crumbs={["Bidder Portal", "Verification Result"]}>
        <div style={{ padding: 32 }}>
          <Card style={{ padding: 16, background: "var(--risk-bg)", color: "var(--risk)", fontSize: 13 }}>Couldn&apos;t load this bid: {error}</Card>
        </div>
      </Shell>
    );
  }
  if (!bid) return null;

  const passed = checks.filter((c) => c.match);
  const failed = checks.filter((c) => !c.match);

  return (
    <Shell role="bidder" user={auth.email} title="Verification Result" subtitle={bid.tender_name} crumbs={["Bidder Portal", "Verification Result"]}>
      <div className="fade-in" style={{ padding: 32, maxWidth: 1080 }}>
        <button onClick={() => router.push("/bidder/history")} className="btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", color: "var(--slate)", fontSize: 12.5, fontWeight: 600, marginBottom: 18 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
          <Card style={{ padding: 26, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <ScoreRing score={bid.score} />
            </div>
            <StatusBadge status={bid.status} />
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)", textAlign: "left" }}>
              <div style={{ fontSize: 11, color: "var(--slate-light)", fontWeight: 700, marginBottom: 8 }}>SUBMISSION DETAILS</div>
              {[
                ["Bid ID", bid.bid_ref],
                ["Company", bid.company_name],
                ["Submitted", new Date(bid.created_at).toLocaleString()],
                ["Document", bid.document_name],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: "var(--slate-light)" }}>{k}</span>
                  <span style={{ fontWeight: 600, textAlign: "right", maxWidth: 160 }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <div>
            <Card style={{ padding: "20px 4px 4px" }}>
              <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="serif" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Field-by-field verification</h3>
                <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                  <span style={{ color: "var(--safe)", fontWeight: 600 }}>{passed.length} verified</span>
                  <span style={{ color: "var(--risk)", fontWeight: 600 }}>{failed.length} failed</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 14, padding: "0 16px 8px", fontSize: 10.5, fontWeight: 700, color: "var(--slate-light)", letterSpacing: 0.3 }}>
                <div>FIELD</div>
                <div>EXTRACTED VALUE</div>
                <div>EXPECTED VALUE</div>
                <div>RESULT</div>
              </div>
              {checks.map((c, i) => (
                <FieldCompareRow key={i} check={c} />
              ))}
            </Card>

            <Card style={{ padding: 22, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={16} color={bid.status === "SAFE" || bid.status === "COMPLIANT" ? "var(--safe)" : bid.status === "MODERATE" || bid.status === "PARTIALLY COMPLIANT" ? "var(--moderate)" : "var(--risk)"} />
                <h3 className="serif" style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>Recommended actions</h3>
              </div>
              {failed.length > 0 ? (
                failed.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--slate)", marginBottom: 9, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--teal)", fontWeight: 700 }}>·</span> Review failure in {c.field_name}: {c.explanation || "Extracted value does not match requirement."}
                  </div>
                ))
              ) : (
                <div style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--slate)", marginBottom: 9, lineHeight: 1.5 }}>
                  <span style={{ color: "var(--teal)", fontWeight: 700 }}>·</span> All checks passed. Proceed to technical evaluation.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
