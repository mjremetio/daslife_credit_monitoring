import { NextResponse } from "next/server";

const APP_SCRIPT_URL = process.env.GOOGLE_APP_SCRIPT_URL;
const APP_SCRIPT_KEY = process.env.GOOGLE_APP_SCRIPT_API_KEY;

export async function GET() {
  if (!APP_SCRIPT_URL || !APP_SCRIPT_KEY) {
    return NextResponse.json({ connected: false, reason: "Missing App Script env" }, { status: 200 });
  }

  try {
    const res = await fetch(`${APP_SCRIPT_URL}?action=ping&key=${APP_SCRIPT_KEY}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const payload = await res.json();
    return NextResponse.json({ connected: true, response: payload }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ connected: false, reason: String(error) }, { status: 200 });
  }
}
