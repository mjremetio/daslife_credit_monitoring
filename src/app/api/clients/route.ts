import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";
import { fetchFullClients, replaceAllData } from "@/lib/db";
import { ClientProfile, IssueRecord, CreditMonitoringRecord, DocRecord } from "@/types/models";

seedIfEmpty();

export async function GET() {
  const data = fetchFullClients();
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const clients = (body.clients || []) as ClientProfile[];
  const issues = (body.issues || []) as IssueRecord[];
  const cmIssues = (body.cmIssues || []) as CreditMonitoringRecord[];
  const docs = (body.docs || []) as DocRecord[];

  replaceAllData({ clients, issues, cmIssues, docs });
  return NextResponse.json({ ok: true, counts: { clients: clients.length, issues: issues.length, docs: docs.length, cmIssues: cmIssues.length } });
}
