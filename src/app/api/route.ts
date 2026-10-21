import { NextResponse } from "next/server";

/** Liveness probe for deployments and smoke checks. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "phytospectra-frontend",
  });
}
