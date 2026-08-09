"use client";

import { useTrak } from "@/context/TrakStore";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { HeadDashboard } from "@/components/dashboard/HeadDashboard";

export default function DashboardPage() {
  const { sessionUser } = useTrak();
  if (sessionUser.role === "head") return <HeadDashboard />;
  return <MemberDashboard user={sessionUser} />;
}
