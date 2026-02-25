import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  addIssue,
  addDoc,
  addCmIssue,
  markProcessed,
  toggleIssueResolved,
  fetchFullClients,
  addClient,
  upsertClients,
  deleteClient,
  updateIssue,
  deleteIssue,
  updateDoc,
  deleteDoc,
  updateCmIssue,
  deleteCmIssue,
} from "@/lib/db";
import { IssueRecord, DocRecord, CreditMonitoringRecord, ClientProfile, DocStatus, DocCategory } from "@/types/models";

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

  if (action === "updateIssue") {
    const issue: IssueRecord = {
      id: body.id,
      clientId: body.clientId,
      issueType: body.issueType || "",
      messageSent: Boolean(body.messageSent),
      messageDate: body.messageDate || null,
      resolved: Boolean(body.resolved),
      note: body.note || "",
    };
    updateIssue(issue);
    return NextResponse.json({ ok: true, issue });
  }

  if (action === "deleteIssue") {
    deleteIssue(body.issueId);
    return NextResponse.json({ ok: true });
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

  if (action === "updateDoc") {
    const doc: DocRecord = {
      id: body.id,
      clientId: body.clientId,
      docType: body.docType || "Document",
      status: (body.status || "pending") as DocStatus,
      messageSent: Boolean(body.messageSent),
      messageDate: body.messageDate || null,
      note: body.note || "",
      category: (body.category || "completing") as DocCategory,
    };
    updateDoc(doc);
    return NextResponse.json({ ok: true, doc });
  }

  if (action === "deleteDoc") {
    deleteDoc(body.docId);
    return NextResponse.json({ ok: true });
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

  if (action === "updateCmIssue") {
    const cm: CreditMonitoringRecord = {
      id: body.id,
      clientId: body.clientId,
      platform: body.platform || "Smart Credit",
      issue: body.issue || "",
      messageSent: Boolean(body.messageSent),
      messageDate: body.messageDate || null,
      resolved: Boolean(body.resolved),
    };
    updateCmIssue(cm);
    return NextResponse.json({ ok: true, cm });
  }

  if (action === "deleteCmIssue") {
    deleteCmIssue(body.cmId);
    return NextResponse.json({ ok: true });
  }

  if (action === "addClient") {
    const today = body.dateProcessed || new Date().toISOString().slice(0, 10);
    const nextDue = body.nextDueDate
      ? body.nextDueDate
      : (() => {
          const dt = new Date(today);
          dt.setDate(dt.getDate() + 30);
          return dt.toISOString().slice(0, 10);
        })();
    const client: ClientProfile = {
      id: crypto.randomUUID(),
      name: body.name || "Unnamed",
      onboardDate: body.onboardDate || null,
      disputer: body.disputer || "",
      status: body.status || "Active",
      round: Number(body.round || 1),
      dateProcessed: today,
      nextDueDate: nextDue,
      notes: body.notes || "",
      flags: body.flags || "",
      isNew: true,
    };
    addClient(client);
    return NextResponse.json({ ok: true, client });
  }

  if (action === "updateClient") {
    const client: ClientProfile = {
      id: body.id,
      name: body.name || "Unnamed",
      onboardDate: body.onboardDate || null,
      disputer: body.disputer || "",
      status: body.status || "Active",
      round: Number(body.round || 1),
      dateProcessed: body.dateProcessed || null,
      nextDueDate: body.nextDueDate || null,
      notes: body.notes || "",
      flags: body.flags || "",
      isNew: Boolean(body.isNew ?? false),
    };
    upsertClients([client]);
    return NextResponse.json({ ok: true, client });
  }

  if (action === "deleteClient") {
    deleteClient(body.clientId);
    return NextResponse.json({ ok: true });
  }

  if (action === "snapshot") {
    return NextResponse.json({ data: fetchFullClients() });
  }

  return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
}
