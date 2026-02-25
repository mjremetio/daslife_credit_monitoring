import { NextResponse } from "next/server";
import crypto from "crypto";
import { addIssue, addDoc, addCmIssue, markProcessed, toggleIssueResolved, fetchFullClients } from "@/lib/db";
import { IssueRecord, DocRecord, CreditMonitoringRecord, DocStatus, DocCategory } from "@/types/models";

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "markProcessed") {
    markProcessed(body.clientId, new Date().toISOString().slice(0, 10));
    return NextResponse.json({ ok: true });
  }

  if (action === "toggleIssue") {
    toggleIssueResolved(body.issueId, Boolean(body.resolved));
    return NextResponse.json({ ok: true });
  }

  if (action === "addIssue") {
    const issue: IssueRecord = {
      id: crypto.randomUUID(),
      clientId: body.clientId,
      issueType: body.issueType || "",
      messageSent: Boolean(body.messageSent),
      messageDate: body.messageDate || new Date().toISOString().slice(0, 10),
      resolved: Boolean(body.resolved),
      note: body.note || "",
    };
    addIssue(issue);
    return NextResponse.json({ ok: true, issue });
  }

  if (action === "addDoc") {
    const doc: DocRecord = {
      id: crypto.randomUUID(),
      clientId: body.clientId,
      docType: body.docType || "Document",
      status: (body.status || "pending") as DocStatus,
      messageSent: Boolean(body.messageSent),
      messageDate: body.messageDate || null,
      note: body.note || "",
      category: (body.category || "completing") as DocCategory,
    };
    addDoc(doc);
    return NextResponse.json({ ok: true, doc });
  }

  if (action === "addCmIssue") {
    const cm: CreditMonitoringRecord = {
      id: crypto.randomUUID(),
      clientId: body.clientId,
      platform: body.platform || "Smart Credit",
      issue: body.issue || "",
      messageSent: Boolean(body.messageSent),
      messageDate: body.messageDate || null,
      resolved: Boolean(body.resolved),
    };
    addCmIssue(cm);
    return NextResponse.json({ ok: true, cm });
  }

  if (action === "snapshot") {
    return NextResponse.json({ data: fetchFullClients() });
  }

  return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
}
