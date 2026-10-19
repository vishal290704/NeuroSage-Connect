"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || "Unable to sign in."); return; }
      router.replace("/admin/dashboard");
    } catch { toast.error("Sign-in is temporarily unavailable."); }
    finally { setBusy(false); }
  }
  return <form className="admin-login-form" onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="username" required maxLength={254} /></label><label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={200} /></label><button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><p>Accounts are provisioned by the organization. Public administrator registration is disabled.</p></form>;
}