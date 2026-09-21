-- =========================================================================
-- BidVerify — Supabase Schema
-- Run this file in Supabase Dashboard -> SQL Editor -> New query -> Run
-- =========================================================================

-- ---------- Reference / registry tables ----------
-- These simulate the government registries a real system would sync from
-- (Income Tax PAN database, GSTN, Udyam/MSME portal, MCA21 for CIN).

create table if not exists pan_records (
  id uuid primary key default gen_random_uuid(),
  pan text unique not null,
  legal_name text not null,
  status text not null default 'Active',
  created_at timestamptz default now()
);

create table if not exists gst_records (
  id uuid primary key default gen_random_uuid(),
  gstin text unique not null,
  legal_name text not null,
  state text,
  status text not null default 'Active',
  created_at timestamptz default now()
);

create table if not exists udyam_records (
  id uuid primary key default gen_random_uuid(),
  udyam_number text unique not null,
  legal_name text not null,
  category text,
  created_at timestamptz default now()
);

create table if not exists cin_records (
  id uuid primary key default gen_random_uuid(),
  cin text unique not null,
  legal_name text not null,
  incorporation_date date,
  created_at timestamptz default now()
);

-- ---------- Bid submissions ----------

create table if not exists bid_submissions (
  id uuid primary key default gen_random_uuid(),
  bid_ref text unique not null,
  tender_name text not null,
  bidder_email text not null,
  company_name text,
  pan_number text,
  cin_number text,
  gstin_number text,
  udyam_number text,
  epfo_code text,
  bid_amount numeric default 0,
  document_name text,
  document_url text,
  ocr_raw_text text,
  verification_checks jsonb not null default '[]'::jsonb,
  score int,
  status text check (status in ('SAFE', 'MODERATE', 'RISK', 'PENDING', 'COMPLIANT', 'PARTIALLY COMPLIANT', 'NON-COMPLIANT', 'REVIEW REQUIRED')) default 'PENDING',
  created_at timestamptz default now()
);

-- ---------- Indexes ----------
create index if not exists idx_bid_submissions_bidder_email on bid_submissions(bidder_email);
create index if not exists idx_bid_submissions_status on bid_submissions(status);

-- ---------- Row Level Security ----------

alter table pan_records enable row level security;
alter table gst_records enable row level security;
alter table udyam_records enable row level security;
alter table cin_records enable row level security;
alter table bid_submissions enable row level security;

drop policy if exists "public read pan_records" on pan_records;
create policy "public read pan_records" on pan_records for select using (true);

drop policy if exists "public read gst_records" on gst_records;
create policy "public read gst_records" on gst_records for select using (true);

drop policy if exists "public read udyam_records" on udyam_records;
create policy "public read udyam_records" on udyam_records for select using (true);

drop policy if exists "public read cin_records" on cin_records;
create policy "public read cin_records" on cin_records for select using (true);

drop policy if exists "public read bid_submissions" on bid_submissions;
create policy "public read bid_submissions" on bid_submissions for select using (true);

drop policy if exists "public insert bid_submissions" on bid_submissions;
create policy "public insert bid_submissions" on bid_submissions for insert with check (true);

drop policy if exists "public update bid_submissions" on bid_submissions;
create policy "public update bid_submissions" on bid_submissions for update using (true);

-- ---------- Tender Rules ----------

create table if not exists tender_rules (
  id uuid primary key default gen_random_uuid(),
  tender_name text unique not null,
  rules jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table tender_rules enable row level security;
drop policy if exists "public read tender_rules" on tender_rules;
create policy "public read tender_rules" on tender_rules for select using (true);

drop policy if exists "public insert tender_rules" on tender_rules;
create policy "public insert tender_rules" on tender_rules for insert with check (true);

drop policy if exists "public update tender_rules" on tender_rules;
create policy "public update tender_rules" on tender_rules for update using (true);

-- ---------- Verification Results ----------

create table if not exists verification_results (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid references bid_submissions(id) on delete cascade,
  field_name text not null,
  requirement text,
  expected_value text,
  extracted_value text,
  status text not null, -- PASS, FAIL, WARNING, NOT FOUND
  confidence numeric,
  explanation text,
  evidence_text text,
  source_page int default 1,
  evidence_coordinates jsonb,
  created_at timestamptz default now()
);

alter table verification_results enable row level security;
drop policy if exists "public read verification_results" on verification_results;
create policy "public read verification_results" on verification_results for select using (true);

drop policy if exists "public insert verification_results" on verification_results;
create policy "public insert verification_results" on verification_results for insert with check (true);

drop policy if exists "public update verification_results" on verification_results;
create policy "public update verification_results" on verification_results for update using (true);

-- ---------- Reference / registry tables (Dummy Data) ----------
insert into pan_records (pan, legal_name, status) values
  ('AABCU9603R', 'Unitech Infra Projects Pvt Ltd', 'Active'),
  ('AACCS1234F', 'Suvarna Construction Ltd', 'Active'),
  ('AAFCP7788K', 'Prime Buildtech Pvt Ltd', 'Active'),
  ('AAGCM4521B', 'Meridian Engineering Works', 'Inactive')
on conflict (pan) do nothing;

insert into gst_records (gstin, legal_name, state, status) values
  ('27AABCU9603R1ZV', 'Unitech Infra Projects Pvt Ltd', 'Maharashtra', 'Active'),
  ('29AACCS1234F1Z5', 'Suvarna Construction Ltd', 'Karnataka', 'Active'),
  ('07AAFCP7788K1ZT', 'Prime Buildtech Pvt Ltd', 'Delhi', 'Cancelled')
on conflict (gstin) do nothing;

insert into udyam_records (udyam_number, legal_name, category) values
  ('UDYAM-MH-33-0012345', 'Unitech Infra Projects Pvt Ltd', 'Small'),
  ('UDYAM-KA-04-0098765', 'Suvarna Construction Ltd', 'Micro')
on conflict (udyam_number) do nothing;

insert into cin_records (cin, legal_name, incorporation_date) values
  ('U45201MH2011PTC221345', 'Unitech Infra Projects Pvt Ltd', '2011-06-14'),
  ('U74999KA2015PTC081234', 'Suvarna Construction Ltd', '2015-02-02'),
  ('U70200DL2009PTC190456', 'Prime Buildtech Pvt Ltd', '2009-11-23')
on conflict (cin) do nothing;
