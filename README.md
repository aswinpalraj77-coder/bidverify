# BidVerify — AI-Powered Bid Compliance Verification Platform

A real, working prototype: **Tesseract.js OCR** (runs in the browser, no API key)
+ **live Supabase** cross-registry verification for PAN, GSTIN, Udyam/MSME, and CIN.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → sign up / log in → **New Project**.
2. Pick a name, database password, and region. Wait ~2 minutes for it to provision.
3. In the project, go to **Project Settings → API**. You'll need two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public key** (a long JWT string)

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `sql/01_schema.sql` from this project, paste its full contents in, and click **Run**.
   This creates the tables: `pan_records`, `gst_records`, `udyam_records`, `cin_records`,
   `bids`, and `bid_verifications`, plus Row Level Security policies.
3. Open a second **New query**, paste in `sql/02_seed_data.sql`, and click **Run**.
   This inserts realistic dummy registry records (4 PAN entries, 3 GST entries, etc.)
   and 3 sample historical bids so the Admin dashboard isn't empty on first load.
4. Confirm it worked: go to **Table Editor** in the sidebar — you should see all 6 tables
   with data in them.

## 3. Configure the app

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste in your Project URL and anon key from step 1:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on the login screen.

- **Bidder demo login:** any email/password (try `bidder@unitech.co.in` / `demo1234` —
  click "Use demo credentials" on the login screen to autofill).
- **Admin demo login:** any email/password (try `admin@procure.gov.in` / `admin1234`).

This prototype uses simple localStorage-based auth so it runs without configuring
Supabase Auth. See "Making auth real" below to upgrade it.

## 5. Try the full OCR → verification flow

1. Log in as a bidder → **Submit Bid**.
2. Upload an image (PNG/JPG) or PDF of a company document — a PAN card, GST
   certificate, MSME/Udyam certificate, or incorporation certificate. You can:
   - Use a real scanned document you have, or
   - Type up a simple test document in Word/Google Docs with fields like
     `Company Name: Unitech Infra Projects Pvt Ltd`, `PAN: AABCU9603R`,
     `GSTIN: 27AABCU9603R1ZV`, `Udyam: UDYAM-MH-33-0012345`,
     `CIN: U45201MH2011PTC221345`, export as PDF/image, and upload that.
3. **Real OCR runs in your browser** (Tesseract.js, WASM) — you'll see a live
   progress percentage. For PDFs, the first page is rasterized via pdf.js
   before OCR.
4. Extracted fields are shown for review — correct anything OCR misread, then
   click **Run Compliance Verification**.
5. The app queries your **live Supabase tables** for each field and computes a
   weighted score (PAN 25%, Company Name 15%, GSTIN 25%, Udyam 15%, CIN 20%),
   returning SAFE (≥80), MODERATE (40–79), or RISK (<40).
6. The result is saved to the `bids` and `bid_verifications` tables and you're
   taken straight to the result page.
7. Log in as admin to see it appear on the Admin Dashboard, All Bids, and
   Verification Registry pages — reading the same live data.

## How the OCR works

`lib/ocr.js`:
- `runOCR()` uses `tesseract.js` to run real Tesseract OCR (English) entirely
  client-side via WebAssembly — no server call, no API key.
- `fileToOcrInput()` detects PDFs and rasterizes page 1 to a canvas using
  `pdf.js` (loaded from CDN) so Tesseract can read it as an image.
- `extractFieldsFromText()` runs regex pattern matching tuned to Indian
  identifier formats to pull structured fields out of the raw OCR text:
  - **PAN**: `AAAAA9999A` format
  - **GSTIN**: `99AAAAA9999A9Z9` format
  - **CIN**: `U99999AA9999AAA999999` format
  - **Udyam**: `UDYAM-AA-99-9999999` format
  - **Company name**: label-based match (`Company Name:`, `M/s`, etc.) with
    a fallback to lines containing common suffixes (`Pvt Ltd`, `LLP`, etc.)

Because this is real OCR on a regex parser (not a trained NER model), scan
quality matters — clear, high-contrast, non-skewed documents extract best.
Any field OCR misses is left blank and editable before verification, so the
demo never silently fails.

## How the Supabase verification works

`lib/verify.js`:
- Queries `pan_records`, `gst_records`, `udyam_records`, `cin_records` directly
  via `@supabase/supabase-js`, matching extracted values against real rows.
- Company name match uses Levenshtein-distance fuzzy comparison against the
  legal name on the matched PAN/GST record (small OCR typos won't
  automatically fail this field).
- Score = weighted percentage of matched fields; thresholds produce the
  SAFE / MODERATE / RISK badge.

## Project structure

```
app/
  login/                  Bidder/Admin login toggle
  bidder/dashboard/       Bidder stats + recent submissions
  bidder/submit/          Upload → OCR → review → verify (real pipeline)
  bidder/result/[id]/     Field-by-field verification result
  bidder/history/         All of a bidder's submissions, filterable
  admin/dashboard/        Org-wide stats + compliance breakdown
  admin/bids/             All bids, searchable/filterable
  admin/bids/[id]/        Same result view + raw OCR text for audit
  admin/registry/         Live view into the Supabase registry tables
components/
  Shell.js                Sidebar + topbar layout, role-aware nav
  ui.js                   StatusBadge, Card, ScoreRing, FieldCompareRow
lib/
  supabaseClient.js        Supabase client singleton
  ocr.js                   Tesseract.js OCR + field extraction
  verify.js                Live Supabase cross-check + scoring
  bids.js                  CRUD helpers for bids/bid_verifications tables
  auth.js                  Simple localStorage demo auth
sql/
  01_schema.sql             Tables + RLS policies
  02_seed_data.sql          Dummy registry data + sample bids
```

## Making auth real (optional next step)

Right now login is a demo (any email/password gets you in, stored in
localStorage). To use real Supabase Auth:

1. In Supabase, enable **Email** auth under **Authentication → Providers**.
2. Replace `lib/auth.js`'s `setAuth`/`getAuth` with
   `supabase.auth.signInWithPassword()` / `supabase.auth.getSession()`.
3. Tighten the RLS policies in `01_schema.sql` on the `bids` table from
   `using (true)` to `using (bidder_email = auth.email())` so bidders can only
   read their own submissions, and add an `is_admin` claim/table for the admin
   role check.

## Deploying

Works out of the box on [Vercel](https://vercel.com): import the repo, add the
two `NEXT_PUBLIC_SUPABASE_*` env vars in the project settings, deploy.
