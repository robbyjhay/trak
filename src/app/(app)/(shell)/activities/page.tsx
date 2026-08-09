"use client";

import { PersonActivities } from "@/components/activity/PersonActivities";
import { useTrak } from "@/context/TrakStore";

export default function ActivitiesPage() {
  const { sessionUser } = useTrak();
  return <PersonActivities userId={sessionUser.id} />;
}
