export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  addDispute,
  updateDispute,
  deleteDispute,
  addRound,
  setClientIssueFlag,
  getClient,
  ISSUE_FLAG_VALUES,
} from "@/lib/db";
import { IssueRecord, DocRecord, CreditMonitoringRecord, ClientProfile, DocStatus, DocCategory, DisputeRecord, RoundHistory, IssueFlag } from "@/types/models";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

  if (action === "markProcessed") {
    try {
      markProcessed(body.clientId, new Date().toISOString().slice(0, 10));
    } catch (err) {
      return NextResponse.json({ ok: false, message: (err as Error).message }, { status: 400 });
    }
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
        messageDate: body.messageSent ? body.messageDate || new Date().toISOString().slice(0, 10) : null,
        resolved: Boolean(body.resolved),
        note: body.note || "",
        round: body.round ?? null,
        priority: (body.priority || "Medium") as IssueRecord["priority"],
      };
      addIssue(issue);
      if (ISSUE_FLAG_VALUES.includes(issue.issueType as IssueFlag)) {
        setClientIssueFlag(issue.clientId, issue.issueType as IssueFlag);
      }
      return NextResponse.json({ ok: true, issue });
    }

    if (action === "updateIssue") {
      const issue: IssueRecord = {
        id: body.id,
        clientId: body.clientId,
        issueType: body.issueType || "",
        messageSent: Boolean(body.messageSent),
        messageDate: body.messageSent ? body.messageDate || null : null,
        resolved: Boolean(body.resolved),
        note: body.note || "",
        round: body.round ?? null,
        priority: (body.priority || "Medium") as IssueRecord["priority"],
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
        messageDate: body.messageSent ? body.messageDate || null : null,
        note: body.note || "",
        category: (body.category || "completing") as DocCategory,
        round: body.round ?? null,
        priority: (body.priority || "Medium") as DocRecord["priority"],
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
        messageDate: body.messageSent ? body.messageDate || null : null,
        note: body.note || "",
        category: (body.category || "completing") as DocCategory,
        round: body.round ?? null,
        priority: (body.priority || "Medium") as DocRecord["priority"],
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
        messageDate: body.messageSent ? body.messageDate || null : null,
        resolved: Boolean(body.resolved),
        round: body.round ?? null,
        priority: (body.priority || "Medium") as CreditMonitoringRecord["priority"],
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
        messageDate: body.messageSent ? body.messageDate || null : null,
        resolved: Boolean(body.resolved),
        round: body.round ?? null,
        priority: (body.priority || "Medium") as CreditMonitoringRecord["priority"],
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
      const issueFlag = (body.issueFlag || "None") as IssueFlag;
      const client: ClientProfile = {
        id: crypto.randomUUID(),
        name: body.name || "Unnamed",
        onboardDate: body.onboardDate || null,
        disputer: body.disputer || "Annabel",
        status: issueFlag === "Completed :)" ? "Completed" : body.status || "Active",
        issueFlag,
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
        disputer: body.disputer || "Annabel",
        issueFlag: (body.issueFlag || "None") as IssueFlag,
        status: ((body.issueFlag || "None") === "Completed :)" ? "Completed" : body.status) || "Active",
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

    if (action === "addDispute") {
      const dispute: DisputeRecord = {
        id: crypto.randomUUID(),
        clientId: body.clientId,
        round: Number(body.round || 1),
        bureau: body.bureau || "Experian",
        status: body.status || "Draft",
        sentDate: body.sentDate || null,
        dueDate: body.dueDate || null,
        outcome: body.outcome || "",
        priority: (body.priority || "Medium") as DisputeRecord["priority"],
        notes: body.notes || "",
        blockerFlags: body.blockerFlags || "",
      };
      addDispute(dispute);
      return NextResponse.json({ ok: true, dispute });
    }

    if (action === "updateDispute") {
      const dispute: DisputeRecord = {
        id: body.id,
        clientId: body.clientId,
        round: Number(body.round || 1),
        bureau: body.bureau || "Experian",
        status: body.status || "Draft",
        sentDate: body.sentDate || null,
        dueDate: body.dueDate || null,
        outcome: body.outcome || "",
        priority: (body.priority || "Medium") as DisputeRecord["priority"],
        notes: body.notes || "",
        blockerFlags: body.blockerFlags || "",
      };
      updateDispute(dispute);
      return NextResponse.json({ ok: true, dispute });
    }

    if (action === "deleteDispute") {
      deleteDispute(body.disputeId);
      return NextResponse.json({ ok: true });
    }

    if (action === "addRoundHistory") {
      const round: RoundHistory = {
        id: crypto.randomUUID(),
        clientId: body.clientId,
        round: Number(body.round || 1),
        processedDate: body.processedDate || new Date().toISOString().slice(0, 10),
        nextDueDate: body.nextDueDate || null,
        statusNote: body.statusNote || "",
      };
      addRound(round);
      return NextResponse.json({ ok: true, round });
    }

    if (action === "setIssueFlag") {
      const flag = (body.issueFlag || "None") as IssueFlag;
      if (!ISSUE_FLAG_VALUES.includes(flag)) return NextResponse.json({ ok: false, message: "Invalid issueFlag" }, { status: 400 });
      const client = getClient(body.clientId);
      if (!client) return NextResponse.json({ ok: false, message: "Client not found" }, { status: 404 });
      const status = flag === "Completed :)" ? "Completed" : client.status;
      upsertClients([{ ...client, issueFlag: flag, status }]);
      return NextResponse.json({ ok: true, issueFlag: flag, status });
    }

    if (action === "disputeGate") {
      const clients = fetchFullClients();
      const client = clients.find((c) => c.id === body.clientId);
      if (!client) return NextResponse.json({ ok: false, message: "Client not found" }, { status: 404 });
      const blockers: string[] = [];
      if (client.issues.some((i) => !i.resolved)) blockers.push("Unresolved issues");
      if (client.docs.some((d) => d.status === "pending" || d.status === "sent")) blockers.push("Docs pending/sent");
      if (client.cmIssues.some((cm) => !cm.resolved)) blockers.push("Credit monitoring unresolved");
      if (client.nextDueDate && new Date(client.nextDueDate) > new Date()) blockers.push("Not yet due");
      const ready = blockers.length === 0;
      return NextResponse.json({ ok: true, ready, blockers });
    }

    return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("actions route error", error);
    return NextResponse.json({ ok: false, message: (error as Error).message || "Server error" }, { status: 500 });
  }
}
