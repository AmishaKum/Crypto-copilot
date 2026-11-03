import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { api } from "../lib/api";
import { Button, ErrorState, Field, Input } from "../components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try { setSent((await api("/auth/forgot-password", { body: { email } })).message); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <div className="grid-glow flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md fade-in p-7">
        <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted">Enter your account email and we'll send you a link to choose a new password.</p>
        {sent ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">
            <MailCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p>{sent} Check your inbox and spam folder.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field label="Email" id="email"><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            {error && <ErrorState error={error} compact />}
            <Button type="submit" loading={busy} disabled={!email} className="w-full">Send reset link</Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-muted"><Link className="link" to="/login">Back to log in</Link></p>
      </div>
    </div>
  );
}
