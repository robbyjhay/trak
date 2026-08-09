"use client";

import { use } from "react";
import { PersonActivities } from "@/components/activity/PersonActivities";

export default function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PersonActivities userId={id} />;
}
