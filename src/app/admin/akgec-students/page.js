import { Suspense } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
export const metadata = { title: "AKGEC students | NeuroSage" };
export default function AKGECStudentsPage() { return <Suspense fallback={<main className="admin-dashboard">Loading students…</main>}><AdminDashboard studentsOnly /></Suspense>; }