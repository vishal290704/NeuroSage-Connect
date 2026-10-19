import { Suspense } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
export const metadata = { title: "Registrations | NeuroSage" };
export default function RegistrationsPage() { return <Suspense fallback={<main className="admin-dashboard">Loading registrations…</main>}><AdminDashboard /></Suspense>; }