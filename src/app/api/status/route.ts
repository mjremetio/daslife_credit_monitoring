import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";

export async function GET() {
  try {
    ensureSchema();
    return NextResponse.json({ connected: true, backend: "sqlite" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ connected: false, reason: String(error) }, { status: 500 });
  }
}
