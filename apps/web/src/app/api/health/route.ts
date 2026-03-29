import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "jobtrack-next",
    version: APP_VERSION,
  });
}
