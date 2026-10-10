import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, ErrorState, Field, Input } from "../components/ui";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { user, login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const from = useLocation().state?.from || "/app";
  if (user) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!isLogin && (form.password.length < 8 || !/\d/.test(form.password) || !/[A-Za-z]/.test(form.password))) {
      return setError("Password must be at least 8 characters and include a letter and a number.");
    }
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-glow flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md fade-in p-7">
        <h1 className="font-display text-2xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted">{isLogin ? "Log in to your Bitcoin copilot." : "Free. Practice with virtual money. No card or wallet needed."}</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {!isLogin && (
            <Field label="Name" id="name"><Input id="name" autoComplete="name" required maxLength={60} value={form.name} onChange={set("name")} /></Field>
          )}
          <Field label="Email" id="email"><Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} /></Field>
          <Field label="Password" id="password" hint={!isLogin && "At least 8 characters, with a letter and a number."}>
            <Input id="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} required value={form.password} onChange={set("password")} />
          </Field>
          {error && <ErrorState error={error} compact />}
          <Button type="submit" loading={busy} className="w-full">{isLogin ? "Log in" : "Create account"}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link className="link" to={isLogin ? "/register" : "/login"} state={{ from }}>{isLogin ? "Create an account" : "Log in"}</Link>
        </p>
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-btc/5 p-3 text-xs text-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-btc" aria-hidden />
          We'll never ask for your seed phrase, private keys or exchange logins.
        </p>
      </div>
    </div>
  );
}
