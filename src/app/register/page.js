import { Suspense } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import RegistrationWizard from "@/components/registration/RegistrationWizard";

export const metadata = { title: "Register | NeuroSage", description: "Register for the NeuroSage Mental Wellness Camp." };

export default function RegisterPage() {
  return <><SiteHeader /><main className="registration-page"><div className="registration-aside"><p className="eyebrow">A considered first step</p><h2>There’s no perfect way to begin.</h2><p>Take your time. You can move between steps and change your answers before submitting.</p><div className="aside-note"><span className="aside-symbol">✳</span><p>Your screening answers are not included in routine payment administration or approval emails.</p></div><p className="aside-disclaimer">For immediate emergencies, contact your local emergency services or visit an appropriate emergency department.</p></div><Suspense fallback={<div className="wizard">Preparing your registration form…</div>}><RegistrationWizard /></Suspense></main><footer className="site-footer"><span>NeuroSage · Be kind to your Mind.</span><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></footer></>;
}