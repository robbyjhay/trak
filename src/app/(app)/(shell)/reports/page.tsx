import { UnitReportsDashboard } from "@/components/reports/UnitReportsDashboard";
import { readSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const session = await readSession();
  if (!session || session.role !== "head") {
    redirect("/dashboard");
  }
  return <UnitReportsDashboard />;
}
