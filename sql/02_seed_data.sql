-- =========================================================================
-- BidVerify — Seed / dummy data
-- Run AFTER 01_schema.sql. This populates realistic registry records so
-- the OCR -> verification -> scoring pipeline can be demoed immediately.
-- =========================================================================

-- ---------- PAN registry ----------
insert into pan_records (pan, legal_name, status) values
  ('AABCU9603R', 'Unitech Infra Projects Pvt Ltd', 'Active'),
  ('AACCS1234F', 'Suvarna Construction Ltd', 'Active'),
  ('AAFCP7788K', 'Prime Buildtech Pvt Ltd', 'Active'),
  ('AAGCM4521B', 'Meridian Engineering Works', 'Inactive')
on conflict (pan) do nothing;

-- ---------- GST registry ----------
insert into gst_records (gstin, legal_name, state, status) values
  ('27AABCU9603R1ZV', 'Unitech Infra Projects Pvt Ltd', 'Maharashtra', 'Active'),
  ('29AACCS1234F1Z5', 'Suvarna Construction Ltd', 'Karnataka', 'Active'),
  ('07AAFCP7788K1ZT', 'Prime Buildtech Pvt Ltd', 'Delhi', 'Cancelled')
on conflict (gstin) do nothing;

-- ---------- Udyam / MSME registry ----------
insert into udyam_records (udyam_number, legal_name, category) values
  ('UDYAM-MH-33-0012345', 'Unitech Infra Projects Pvt Ltd', 'Small'),
  ('UDYAM-KA-04-0098765', 'Suvarna Construction Ltd', 'Micro')
on conflict (udyam_number) do nothing;

-- ---------- CIN / MCA registry ----------
insert into cin_records (cin, legal_name, incorporation_date) values
  ('U45201MH2011PTC221345', 'Unitech Infra Projects Pvt Ltd', '2011-06-14'),
  ('U74999KA2015PTC081234', 'Suvarna Construction Ltd', '2015-02-02'),
  ('U70200DL2009PTC190456', 'Prime Buildtech Pvt Ltd', '2009-11-23')
on conflict (cin) do nothing;

-- ---------- Sample historical bids (optional, for a populated demo) ----------
insert into bid_submissions (
  bid_ref, tender_name, bidder_email, company_name, document_name,
  pan_number, gstin_number, udyam_number, cin_number,
  score, status
) values
  (
    'BID-2026-0091', 'NHAI/2026/RD-CONST/118 — Highway Widening Package 4',
    'bidder@unitech.co.in', 'Unitech Infra Projects Pvt Ltd', 'unitech_eligibility_dossier.pdf',
    'AABCU9603R', '27AABCU9603R1ZV', 'UDYAM-MH-33-0012345', 'U45201MH2011PTC221345',
    96, 'SAFE'
  ),
  (
    'BID-2026-0092', 'PWD/KA/2026/BR-77 — Bridge Rehabilitation Works',
    'bidder2@suvarna.in', 'Suvarna Construction Ltd', 'suvarna_company_profile.pdf',
    'AACCS1234F', '29AACCS1234F1Z6', 'UDYAM-KA-04-0098765', 'U74999KA2015PTC081234',
    62, 'MODERATE'
  ),
  (
    'BID-2026-0093', 'MCD/2026/CIVIL-22 — Municipal Complex Renovation',
    'ops@primebuildtech.com', 'Prime Buildtech Pvt Ltd', 'prime_buildtech_kyc.pdf',
    'AAFCP7799K', '07AAFCP7788K1ZT', 'UDYAM-DL-01-0055000', 'U70200DL2009PTC190456',
    34, 'RISK'
  )
on conflict (bid_ref) do nothing;

-- ---------- Tender Rules (Dummy Data) ----------
insert into tender_rules (tender_name, rules) values
  ('NHAI/2026/RD-CONST/118 — Highway Widening Package 4', '[
    {"category": "Financial", "requirement": "Minimum turnover: ₹5 Crore"},
    {"category": "Technical", "requirement": "Warranty: Minimum 18 months"},
    {"category": "Make in India", "requirement": "Local Content Minimum: 60%"},
    {"category": "Eligibility", "requirement": "OEM authorization required"},
    {"category": "Delivery", "requirement": "Delivery period: within 90 days"}
  ]'),
  ('PWD/KA/2026/BR-77 — Bridge Rehabilitation Works', '[
    {"category": "Financial", "requirement": "Minimum turnover: ₹2 Crore"},
    {"category": "Make in India", "requirement": "Local Content Minimum: 50%"}
  ]'),
  ('MCD/2026/CIVIL-22 — Municipal Complex Renovation', '[
    {"category": "Financial", "requirement": "Minimum turnover: ₹1 Crore"}
  ]')
on conflict (tender_name) do nothing;
