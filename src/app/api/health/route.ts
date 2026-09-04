import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "gutcheck",
    geminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
}
