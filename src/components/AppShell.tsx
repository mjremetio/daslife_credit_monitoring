"use client";

import { AuthProvider, useAuth } from "./AuthProvider";
import { Dashboard } from "./Dashboard";
import { FullClient } from "@/types/models";
import { useState } from "react";
import { LogOut, UserCircle } from "lucide-react";

export function AppShell({ initialData }: { initialData: FullClient[] }) {
  return (
    <AuthProvider>
      <Authed initialData={initialData} />
    </AuthProvider>
  );
}

function Authed({ initialData }: { initialData: FullClient[] }) {
  const { user, login, logout } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">Use any username/password for this demo.</p>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await login(username, password);
              if (!ok) setError("Invalid credentials");
            }}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Username</label>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Password</label>
              <input
                type="password"
                className="rounded-xl border border-slate-200 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold">DL</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">DasLife Credit Monitor</p>
            <p className="text-xs text-slate-500">AdminLTE-style shell</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
            <UserCircle size={16} /> {user.name}
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            onClick={logout}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <Dashboard initialData={initialData} />
    </div>
  );
}
