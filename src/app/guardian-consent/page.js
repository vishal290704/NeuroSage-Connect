"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";

function GuardianConsentContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState("ready");
  const [message, setMessage] = useState("");
  async function confirm() {
    setState("busy");
    const response = await fetch("/api/guardian-consent/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: searchParams.get("token") }) }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setState(response?.ok ? "done" : "error");
    setMessage(data?.message || data?.error || "Consent could not be recorded. Please contact NeuroSage support.");
  }
  return <><SiteHeader /><main className="narrow-page"><p className="eyebrow">NeuroSage · Parent or guardian consent</p><h1>Review this consent request</h1><p>A participant under 18 has listed you as their parent or legal guardian. Confirm only if you are authorized to provide consent for this participant.</p><div className="warning-box">This confirmation records your consent for this event registration. It does not verify your identity or legal authority. Contact the organizer if you need to correct the request.</div>{state === "done" ? <p className="inline-success" role="status">{message}</p> : state === "error" ? <p className="field-error" role="alert">{message}</p> : <button className="primary-button" disabled={state === "busy"} onClick={confirm}>{state === "busy" ? "Recording…" : "I confirm as parent or legal guardian"}</button>}</main></>;
}

export default function GuardianConsentPage() { return <Suspense fallback={<main className="narrow-page">Loading consent request…</main>}><GuardianConsentContent /></Suspense>; }