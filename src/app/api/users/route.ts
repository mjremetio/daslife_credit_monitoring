import { NextResponse } from "next/server";
import crypto from "crypto";
import { addUser, deleteUser, fetchUsers, updateUser } from "@/lib/db";
import { User } from "@/types/models";

export async function GET() {
  const users = fetchUsers();
  return NextResponse.json({ data: users });
}

export async function POST(req: Request) {
  const body = await req.json();
  const user: User = {
    id: crypto.randomUUID(),
    name: body.name || "User",
    email: body.email || "",
    role: body.role || "Disputer",
    status: (body.status || "Active") as User["status"],
  };
  addUser(user);
  return NextResponse.json({ ok: true, user });
}

export async function PUT(req: Request) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  const user: User = {
    id: body.id,
    name: body.name || "User",
    email: body.email || "",
    role: body.role || "Disputer",
    status: (body.status || "Active") as User["status"],
  };
  updateUser(user);
  return NextResponse.json({ ok: true, user });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  deleteUser(body.id);
  return NextResponse.json({ ok: true });
}
