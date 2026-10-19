import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata = { title: "Administrator sign in | NeuroSage" };

export default function AdminLoginPage() {
  return <><SiteHeader /><main className="admin-login-page"><div><p className="eyebrow">Restricted access</p><h1>Administrator sign in</h1><p>Authorized team members only.</p><AdminLoginForm /><Link className="back-link" href="/">Return to NeuroSage</Link></div></main></>;
}