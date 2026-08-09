"use client";

import { use, useState } from "react";
import { ActivityDetail } from "@/components/activity/ActivityDetail";

export default function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // key forces remount after submit re-render paths that need fresh state
  const [key, setKey] = useState(0);
  return (
    <ActivityDetail
      key={key}
      activityId={id}
      onSubmitted={() => setKey((k) => k + 1)}
    />
  );
}
