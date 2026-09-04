import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Dials from "@/components/dev/Dials";

// Set NEXT_PUBLIC_SITE_URL to the deployed origin so canonicals, Open Graph
// URLs and the sitemap all resolve absolutely.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gutcheck.app";

const title = "Gutcheck: Decision Journal That Scores Your Judgment";
const description =
  "Write down the decisions you are unsure about, record how confident you are, and find out how often you were right. Private journal with a calibration score.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | Gutcheck" },
  description,
  applicationName: "Gutcheck",
  keywords: [
    "decision journal",
    "decision tracking",
    "calibration score",
    "Brier score",
    "forecasting journal",
    "prediction tracking",
    "journaling app",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    title,
    description,
    siteName: "Gutcheck",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: "#0e131a",
  width: "device-width",
  initialScale: 1,
};

/** Structured data. AI summarizers and rich results parse this more reliably
 *  than they parse the page prose. */
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Gutcheck",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Decision tracking with confidence ratings",
        "Calibration score and over/under confidence bias",
        "Mood and energy trend analysis",
        "Weekly recap",
        "Plain-language search across entries",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is a decision journal?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A decision journal is a record of the choices you make while you are still uncertain about them, written down with your reasoning and how confident you feel. Reviewing it later shows whether your judgment is as good as you think.",
          },
        },
        {
          "@type": "Question",
          name: "What is a calibration score?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A calibration score measures how well your stated confidence matches your actual accuracy. If you say you are 80% sure and you are right about 80% of the time, you are well calibrated. Gutcheck uses a Brier score plus a signed bias showing whether you run over or under confident.",
          },
        },
        {
          "@type": "Question",
          name: "Is my journal private?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Entries are stored against your own account, isolated by owner-bound database rules and server-side checks. They are never used for training and there are no third-party trackers.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="gutcheck">
      {/* Browser extensions (password managers, colour pickers, grammar tools)
          add attributes to <body> before React hydrates, which React reports as
          a mismatch. Suppressing it here covers only this element's attributes,
          not the tree below it. */}
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <AuthProvider>{children}</AuthProvider>
        <Dials />
      </body>
    </html>
  );
}
