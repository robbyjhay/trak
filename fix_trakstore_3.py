import re

with open("src/context/TrakStore.tsx", "r") as f:
    text = f.read()

exceptions_code = '''    requestException: async (activityId, explanation) => {
      const res = await apiSend<{
        activity: Activity;
        notification: Notification;
      }>(`/api/activities/${activityId}`, "PATCH", {
        action: "requestException",
        explanation,
      });
      const actIdx = stateRef.current.db.activities.findIndex(
        (a) => a.id === activityId,
      );
      if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
      mergeNotifications([res.notification]);
      bump();
    },
    approveException: async (activityId) => {
      const res = await apiSend<{
        activity: Activity;
        notificationToMember: Notification;
        notificationToHead: Notification;
      }>(`/api/activities/${activityId}`, "PATCH", {
        action: "approveException",
      });
      const actIdx = stateRef.current.db.activities.findIndex(
        (a) => a.id === activityId,
      );
      if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
      mergeNotifications([res.notificationToMember, res.notificationToHead]);
      bump();
    },
    rejectException: async (activityId) => {
      const res = await apiSend<{
        activity: Activity;
        notificationToMember: Notification;
      }>(`/api/activities/${activityId}`, "PATCH", {
        action: "rejectException",
      });
      const actIdx = stateRef.current.db.activities.findIndex(
        (a) => a.id === activityId,
      );
      if (actIdx >= 0) stateRef.current.db.activities[actIdx] = res.activity;
      mergeNotifications([res.notificationToMember]);
      bump();
    },
    activitiesFor:'''

text = text.replace('    activitiesFor:', exceptions_code)

mentions_code = '''        mentions: (mentions || []).map(m => ({
          userId: m.userId,
          position: m.position,
          displayName: userMap[m.userId]?.name || "Unknown",
        })),'''

text = text.replace('        mentions: mentions || [],', mentions_code)

with open("src/context/TrakStore.tsx", "w") as f:
    f.write(text)

