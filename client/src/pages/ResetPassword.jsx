import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Button, ErrorState, Field, Input } from "../components/ui";

export default function ResetPassword() {
  const token = useSearchParams()[0].get("token") || "";
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const validToken = /^[0-9a-f]{64}$/.test(token);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8 || !/\d/.test(form.password) || !/[A-Za-z]/.test(form.password)) {
      return setError("Password must be at least 8 characters and include a letter and a number.");
    }
    if (form.password !== form.confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      setDone((await api("/auth/reset-password", { body: { token, password: form.password } })).message);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <div className="grid-glow flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md fade-in p-7">
        <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
        {!validToken ? (
          <div className="mt-6 space-y-4">
            <ErrorState error="This reset link is incomplete or invalid. Please request a new one." />
            <Link to="/forgot-password" className="link text-sm">Request a new reset link</Link>
          </div>
        ) : done ? (
          <p className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">{done} Redirecting to log in…</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field label="New password" id="password" hint="At least 8 characters, with a letter and a number.">
              <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Confirm new password" id="confirm">
              <Input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </Field>
            {error && <ErrorState error={error} compact />}
            {error?.code === "RESET_INVALID" && <Link to="/forgot-password" className="link text-sm">Request a new reset link</Link>}
            <Button type="submit" loading={busy} className="w-full">Reset password</Button>
          </form>
        )}
      </div>
    </div>
  );
}
