import { supabase } from "./supabaseClient";

export async function createBid({
  tenderName,
  bidderEmail,
  companyName,
  documentName,
  ocrRawText,
  extracted,
  score,
  status,
  checks,
}) {
  const bidRef = "BID-2026-" + Math.floor(1000 + Math.random() * 9000);

  const { data: bid, error } = await supabase
    .from("bid_submissions")
    .insert({
      bid_ref: bidRef,
      tender_name: tenderName,
      bidder_email: bidderEmail,
      company_name: companyName,
      pan_number: extracted.pan,
      cin_number: extracted.cin,
      gstin_number: extracted.gstin,
      udyam_number: extracted.udyam,
      epfo_code: extracted.epfo_code,
      document_name: documentName,
      ocr_raw_text: ocrRawText,
      verification_checks: checks || [],
      score,
      status,
    })
    .select()
    .single();

  if (error) throw error;
  
  if (checks && checks.length > 0) {
    const vrInserts = checks.map(c => ({
      bid_id: bid.id,
      field_name: c.field_name || c.field,
      requirement: c.field_name || c.field,
      expected_value: c.expected_value || c.dbValue,
      extracted_value: c.extracted_value || c.extracted,
      status: c.status || (c.match ? 'PASS' : 'FAIL'),
      confidence: c.confidence || 1.0,
      explanation: c.explanation || c.detail,
      evidence_text: c.evidence_text || c.extracted,
      source_page: 1,
      evidence_coordinates: c.bbox || null
    }));
    
    const { error: vrError } = await supabase.from("verification_results").insert(vrInserts);
    if (vrError) console.error("Failed to insert verification results:", vrError);
  }
  
  return bid;
}

export async function getAllBids() {
  const { data, error } = await supabase.from("bid_submissions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getBidsForBidder(email) {
  const { data, error } = await supabase
    .from("bid_submissions")
    .select("*")
    .eq("bidder_email", email)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getBidById(id) {
  const { data: bid, error } = await supabase.from("bid_submissions").select("*").eq("id", id).single();
  if (error) throw error;

  const { data: results, error: resError } = await supabase.from("verification_results").select("*").eq("bid_id", id);
  if (resError) console.error("Failed to fetch verification results:", resError);

  const checks = results && results.length > 0 ? results.map(r => ({
    field_name: r.field_name,
    expected_value: r.expected_value,
    extracted_value: r.extracted_value,
    status: r.status,
    confidence: r.confidence,
    explanation: r.explanation,
    evidence_text: r.evidence_text,
    bbox: r.evidence_coordinates,
    match: r.status === 'PASS'
  })) : (bid.verification_checks || []);

  return { bid, checks };
}
