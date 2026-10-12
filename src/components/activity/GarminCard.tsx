"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectGarminAction, disconnectGarminAction, syncGarminAction } from "@/app/(app)/activity/actions";

interface Props {
  available: boolean;
  connection: { displayName: string | null; email: string | null; status: string; lastSyncAt: string | null; lastError: string | null } | null;
}

export function GarminCard({ available, connection }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function connect(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await connectGarminAction({ email, password });
      setPassword("");
      if (!res.ok) return setMessage({ kind: "err", text: res.error });
      setMessage(res.synced.ok ? { kind: "ok", text: `Connected. Pulled ${res.synced.days} days of data.` } : { kind: "err", text: `Connected, but the first sync failed: ${res.synced.error}` });
      setShowForm(false);
      router.refresh();
    });
  }

  function sync() {
    setMessage(null);
    start(async () => {
      const res = await syncGarminAction();
      setMessage(res.ok ? { kind: "ok", text: `Synced ${res.days} day${res.days === 1 ? "" : "s"}${res.weights ? ` and ${res.weights} weigh-in${res.weights === 1 ? "" : "s"}` : ""}.` } : { kind: "err", text: res.error });
      router.refresh();
    });
  }

  function disconnect() {
    if (!confirm("Disconnect Garmin? Your synced data stays; the saved login is deleted.")) return;
    start(async () => {
      await disconnectGarminAction();
      setMessage({ kind: "ok", text: "Garmin disconnected." });
      router.refresh();
    });
  }

  const note = message && <p className={`text-sm rounded-xl px-3 py-2 border ${message.kind === "ok" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-700 bg-red-50 border-red-100"}`}>{message.text}</p>;

  if (!available) {
    return (
      <div className="space-y-2 text-sm text-slate-600">
        <p>Garmin sync isn&apos;t set up on this server yet. It needs <code className="text-xs bg-slate-100 px-1 rounded">GARMIN_SERVICE_SECRET</code> and <code className="text-xs bg-slate-100 px-1 rounded">TOKEN_ENCRYPTION_KEY</code>, plus the Python service running (see README).</p>
      </div>
    );
  }

  if (connection && !showForm) {
    const needsReauth = connection.status === "needs_reauth";
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">
              Connected{connection.displayName ? ` as ${connection.displayName}` : ""}
              {connection.email && <span className="text-slate-400 font-normal"> · {connection.email}</span>}
            </p>
            <p className="text-xs text-slate-500">
              {connection.lastSyncAt ? `Last synced ${new Date(connection.lastSyncAt).toLocaleString()}` : "Not synced yet"}
              {needsReauth && " · needs reconnecting"}
            </p>
            {connection.lastError && connection.status !== "connected" && <p className="text-xs text-red-600 mt-1">{connection.lastError}</p>}
          </div>
          <div className="flex gap-2">
            {needsReauth ? (
              <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>Reconnect</button>
            ) : (
              <button type="button" className="btn-primary" onClick={sync} disabled={pending}>{pending ? "Syncing…" : "Sync now"}</button>
            )}
            <button type="button" className="btn-ghost" onClick={disconnect} disabled={pending}>Disconnect</button>
          </div>
        </div>
        {note}
      </div>
    );
  }

  return (
    <form onSubmit={connect} className="space-y-3">
      <p className="text-sm text-slate-600">
        Sign in with your Garmin Connect account to pull in sleep, steps, HRV, stress and scale weight. Your password is used once to get a token and is never stored.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="garmin-email">Garmin email</label>
          <input id="garmin-email" className="input" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="garmin-password">Garmin password</label>
          <input id="garmin-password" className="input" type="password" autoComplete="off" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || !email || !password}>{pending ? "Connecting and syncing…" : "Connect Garmin"}</button>
        {connection && <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>}
      </div>
      <p className="text-xs text-slate-400">
        Uses Garmin&apos;s unofficial API through the open-source garminconnect library. Accounts with two-factor authentication can&apos;t connect; you can skip Garmin and log things by hand instead.
      </p>
      {note}
    </form>
  );
}
