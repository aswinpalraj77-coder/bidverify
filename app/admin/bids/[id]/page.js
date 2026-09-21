"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Shell } from "../../../../components/Shell";
import { Card, StatusBadge, ScoreRing, FieldCompareRow } from "../../../../components/ui";
import { getAuth } from "../../../../lib/auth";
import { getBidById } from "../../../../lib/bids";
import { DocumentViewer } from "../../../../components/DocumentViewer";

const RECS = {
  SAFE: ["All key identifiers matched registry records — proceed to technical evaluation.", "No further manual document verification required for this submission."],
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

export default function AdminBidDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [auth, setAuthState] = useState(null);
  const [bid, setBid] = useState(null);
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState("");
  const [selectedCheck, setSelectedCheck] = useState(null);

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "admin") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
    getBidById(params.id)
      .then(({ bid, checks }) => {
        setBid(bid);
        setChecks(
          checks.map((c) => ({
            field_name: c.field_name,
            extracted_value: c.extracted_value,
            expected_value: c.expected_value,
            status: c.status,
            match: c.status === 'PASS',
            explanation: c.explanation,
            bbox: c.bbox,
            is_xai: c.is_xai || (!["Company Name", "PAN Number", "GSTIN", "CIN", "Udyam / MSME Number", "EPFO Code", "Blacklist Status", "IT Returns", "Local Content %", "Make in India Class"].includes(c.field_name))
          }))
        );
      })
      .catch((e) => setError(e.message));
  }, [router, params.id]);

  if (!auth) return null;
  if (error) {
    return (
      <Shell role="admin" user={auth.email} title="Verification Result" crumbs={["Admin Portal", "Bid Detail"]}>
        <div style={{ padding: 32 }}>
          <Card style={{ padding: 16, background: "var(--risk-bg)", color: "var(--risk)", fontSize: 13 }}>Couldn&apos;t load this bid: {error}</Card>
        </div>
      </Shell>
    );
  }
  if (!bid) return null;

  const passed = checks.filter((c) => c.status === 'PASS');
  const failed = checks.filter((c) => c.status === 'FAIL' || c.status === 'NOT FOUND');

  return (
    <Shell role="admin" user={auth.email} title="Verification Result" subtitle={bid.tender_name} crumbs={["Admin Portal", "Bid Detail"]}>
      <div className="fade-in" style={{ padding: "32px 40px", maxWidth: 1600, margin: "0 auto", height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
        <button onClick={() => router.push("/admin/bids")} className="btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", color: "var(--slate)", fontSize: 13, fontWeight: 600, marginBottom: 24, flexShrink: 0 }}>
          <ArrowLeft size={16} /> Back to all bids
        </button>

        <div style={{ display: "flex", gap: 32, flex: 1, minHeight: 0 }}>
          
          {/* Left Pane - Document Viewer */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
            <DocumentViewer bidId={bid.id} selectedCheck={selectedCheck} />
          </div>

          {/* Right Pane - Compliance Dashboard & Info */}
          <div style={{ width: 600, display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", paddingRight: 12 }}>
            <Card style={{ padding: 32, textAlign: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <ScoreRing score={bid.score} size={140} />
              </div>
              <StatusBadge status={bid.status} />
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "var(--slate-light)", fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>SUBMISSION DETAILS</div>
                {[
                  ["Bid ID", bid.bid_ref],
                  ["Company", bid.company_name],
                  ["Bidder", bid.bidder_email],
                  ["Submitted", new Date(bid.created_at).toLocaleString()],
                  ["Document", bid.document_name],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10, gap: 12 }}>
                    <span style={{ color: "var(--slate)", flexShrink: 0 }}>{k}</span>
                    <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word", color: "var(--navy)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ padding: "24px 0 0", flexShrink: 0 }}>
              <div style={{ padding: "0 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Explainable AI (XAI) Flags</h3>
                <div style={{ display: "flex", gap: 16, fontSize: 12.5 }}>
                  <span style={{ color: "var(--safe)", fontWeight: 600, background: "var(--safe-bg)", padding: "4px 10px", borderRadius: 20 }}>{passed.length} verified</span>
                  <span style={{ color: "var(--risk)", fontWeight: 600, background: "var(--risk-bg)", padding: "4px 10px", borderRadius: 20 }}>{failed.length} failed</span>
                </div>
              </div>
              
              <div style={{ padding: "0 24px 16px", fontSize: 13, color: "var(--slate-light)", lineHeight: 1.5 }}>
                Click on any flag below to highlight the corresponding extracted text in the original document.
              </div>

              {["Statutory Registrations", "Financial Compliance", "Make in India", "Tender Custom Rules (XAI)"].map((groupName) => {
                const groupChecks = checks.filter(c => {
                  if (groupName === "Statutory Registrations") return ["Company Name", "PAN Number", "GSTIN", "CIN", "Udyam / MSME Number"].includes(c.field_name);
                  if (groupName === "Financial Compliance") return ["EPFO Code", "Blacklist Status", "IT Returns"].includes(c.field_name);
                  if (groupName === "Make in India") return ["Local Content %", "Make in India Class"].includes(c.field_name);
                  if (groupName === "Tender Custom Rules (XAI)") return c.is_xai;
                  return false;
                });

                if (groupChecks.length === 0) return null;

                return (
                  <div key={groupName}>
                    <h4 style={{ padding: "12px 24px", margin: 0, fontSize: 13, background: "#f8fafc", color: "var(--navy)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                      {groupName}
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", gap: 16, padding: "16px 20px 8px", fontSize: 10.5, fontWeight: 700, color: "var(--slate-light)", letterSpacing: 0.5 }}>
                      <div>FIELD</div>
                      <div>EXTRACTED VALUE</div>
                      <div>EXPECTED VALUE</div>
                      <div>RESULT</div>
                    </div>
                    {groupChecks.map((c, i) => (
                      <div 
                        key={`${groupName}-${i}`} 
                        onClick={() => setSelectedCheck(c)}
                        style={{ 
                          cursor: "pointer", 
                          background: selectedCheck?.field_name === c.field_name ? "var(--bg)" : "transparent",
                          transition: "background 0.2s"
                        }}
                      >
                        <FieldCompareRow check={c} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </Card>

            <Card style={{ padding: 28, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <AlertTriangle size={18} color={bid.status === "SAFE" || bid.status === "COMPLIANT" ? "var(--safe)" : bid.status === "MODERATE" || bid.status === "PARTIALLY COMPLIANT" ? "var(--moderate)" : "var(--risk)"} />
                <h3 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Recommended actions</h3>
              </div>
              {failed.length > 0 ? (
                failed.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, fontSize: 13.5, color: "var(--navy-soft)", marginBottom: 12, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--teal)", fontWeight: 700, marginTop: -2 }}>•</span> Review failure in {c.field_name}: {c.explanation || "Extracted value does not match requirement."}
                  </div>
                ))
              ) : (
                <div style={{ display: "flex", gap: 12, fontSize: 13.5, color: "var(--navy-soft)", marginBottom: 12, lineHeight: 1.5 }}>
                  <span style={{ color: "var(--teal)", fontWeight: 700, marginTop: -2 }}>•</span> All checks passed. Proceed to technical evaluation.
                </div>
              )}
            </Card>

            {bid.ocr_raw_text && (
              <Card style={{ padding: 28, flexShrink: 0, marginBottom: 24 }}>
                <h3 className="serif" style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Raw OCR output</h3>
                <pre className="mono" style={{ fontSize: 12, background: "var(--bg)", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", maxHeight: 250, overflowY: "auto", margin: 0, color: "var(--slate)", border: "1px solid var(--border)" }}>{bid.ocr_raw_text}</pre>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
