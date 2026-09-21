import "./globals.css";

export const metadata = {
  title: "BidVerify — Bid Compliance Verification Platform",
  description: "AI-powered OCR extraction and registry cross-verification for tender eligibility documents.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
