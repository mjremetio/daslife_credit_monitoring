import { NextResponse } from "next/server";
import sampleData from "@/data/clients.sample.json";
import { ClientRecord, SheetSource } from "@/types/client";
import { normalizeFromAny, serializeForSheet } from "@/lib/transform";

const APP_SCRIPT_URL = process.env.GOOGLE_APP_SCRIPT_URL;
const APP_SCRIPT_KEY = process.env.GOOGLE_APP_SCRIPT_API_KEY;

const normalizeList = (data: unknown): ClientRecord[] => {
  if (!Array.isArray(data)) return [];
  return data.map((row, idx) => normalizeFromAny(row as Record<string, unknown>, idx));
};

const getFromSample = () => ({
  data: normalizeList(sampleData),
  source: "sample" as SheetSource,
  error: APP_SCRIPT_URL && APP_SCRIPT_KEY ? undefined : "App Script env missing",
});

async function fetchFromSheet() {
  if (!APP_SCRIPT_URL || !APP_SCRIPT_KEY) return getFromSample();

  try {
    const res = await fetch(`${APP_SCRIPT_URL}?action=list&key=${APP_SCRIPT_KEY}`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Sheet returned ${res.status}`);
    const payload = await res.json();
    const data = normalizeList(payload.data ?? payload.records ?? payload);
    return {
      data,
      source: "google-sheet" as SheetSource,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Sheet fetch failed", error);
    return { ...getFromSample(), source: "error" as SheetSource, error: String(error) };
  }
}

export async function GET() {
  const result = await fetchFromSheet();
  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: Request) {
  if (!APP_SCRIPT_URL || !APP_SCRIPT_KEY) {
    return NextResponse.json({ message: "Missing GOOGLE_APP_SCRIPT_URL or GOOGLE_APP_SCRIPT_API_KEY" }, { status: 500 });
  }

  const body = await req.json();
  const records: ClientRecord[] = Array.isArray(body?.records) ? body.records : [];
  const prepared = records.map(serializeForSheet);

  try {
    const response = await fetch(`${APP_SCRIPT_URL}?action=bulkUpdate&key=${APP_SCRIPT_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: prepared }),
    });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ message: text || "Failed to write to sheet" }, { status: 502 });
    }
    const payload = await response.json();
    return NextResponse.json({ ok: true, payload }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error talking to App Script", error: String(error) }, { status: 500 });
  }
}
