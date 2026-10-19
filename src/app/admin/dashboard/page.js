import { Suspense } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
export const metadata = { title: "Admin overview | NeuroSage" };
export default function DashboardPage() { return <Suspense fallback={<main className="admin-dashboard">Loading dashboard…</main>}><AdminDashboard /></Suspense>; }