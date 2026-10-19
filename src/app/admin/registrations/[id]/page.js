import { Suspense } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
export const metadata = { title: "Registration review | NeuroSage" };
async function RegistrationDetailContent({ params }) { const { id } = await params; return <AdminDashboard registrationId={id} />; }
export default function RegistrationDetailPage({ params }) { return <Suspense fallback={<main className="admin-dashboard">Loading registration…</main>}><RegistrationDetailContent params={params} /></Suspense>; }