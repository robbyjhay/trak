import re

with open("src/context/TrakStore.tsx", "r") as f:
    text = f.read()

# Fix TrakStoreValue interface
text = text.replace(
    '  sendDm: (toId: string, text: string, attachments?: SendMessageAttachmentInput[]) => Promise<void>;\n  sendCommunity: (text: string, attachments?: SendMessageAttachmentInput[], mentions?: { userId: string; position: number }[]) => Promise<void>;',
    '  sendDm: (toId: string, text: string, attachments?: SendMessageAttachmentInput[], replyToId?: string | null) => Promise<void>;\n  sendCommunity: (text: string, attachments?: SendMessageAttachmentInput[], mentions?: { userId: string; position: number }[], replyToId?: string | null) => Promise<void>;'
)

text = text.replace(
    '  deactivateResponsibility: (id: string) => Promise<void>;\n  activitiesFor: (userId: string) => Activity[];',
    '  deactivateResponsibility: (id: string) => Promise<void>;\n  requestException: (activityId: string, explanation: string) => Promise<void>;\n  approveException: (activityId: string) => Promise<void>;\n  rejectException: (activityId: string) => Promise<void>;\n  activitiesFor: (userId: string) => Activity[];'
)

# Fix sendDm implementation
text = text.replace(
    '    sendDm: async (toId, text, attachments) => {\n      const tempId = `temp_${Date.now()}`;\n      stateRef.current.db.dms.push({\n        id: tempId,\n        from: session.id,\n        to: toId,\n        text,\n        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),\n        at: new Date().toISOString(),\n      });\n      bump();\n      try {\n        const res = await apiSend<{\n          dms: typeof db.dms;\n          notifications: Notification[];\n        }>("/api/messages/dms", "POST", { toId, text, attachments });',
    '''    sendDm: async (toId, text, attachments, replyToId) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.dms.push({
        id: tempId,
        from: session.id,
        to: toId,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
        replyToId: replyToId || null,
        replyTo: replyToId ? (() => {
          const orig = stateRef.current.db.dms.find((m) => m.id === replyToId) as any;
          if (!orig) return null;
          return {
            id: orig.id,
            from: orig.from,
            text: orig.text || "",
            at: orig.at,
            attachments: orig.attachments,
            isDeleted: orig.isDeleted,
          };
        })() : null,
      });
      bump();
      try {
        const res = await apiSend<{
          dms: typeof db.dms;
          notifications: Notification[];
        }>("/api/messages/dms", "POST", { toId, text, attachments, replyToId: replyToId || null });'''
)

# Fix sendCommunity implementation
text = text.replace(
    '    sendCommunity: async (text, attachments, mentions) => {\n      const tempId = `temp_${Date.now()}`;\n      stateRef.current.db.community.push({\n        id: tempId,\n        from: session.id,\n        text,\n        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),\n        at: new Date().toISOString(),\n        replyToId: null,\n      });\n      bump();\n      try {\n        const res = await apiSend<{ community: typeof db.community }>(\n          "/api/messages/community",\n          "POST",\n          { text, attachments, mentions },\n        );',
    '''    sendCommunity: async (text, attachments, mentions, replyToId) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.community.push({
        id: tempId,
        from: session.id,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
        replyToId: replyToId || null,
        mentions: mentions || [],
        replyTo: replyToId ? (() => {
          const orig = stateRef.current.db.community.find((m) => m.id === replyToId) as any;
          if (!orig) return null;
          return {
            id: orig.id,
            from: orig.from,
            text: orig.text || "",
            at: orig.at,
            attachments: orig.attachments,
            isDeleted: orig.isDeleted,
          };
        })() : null,
      });
      bump();
      try {
        const res = await apiSend<{ community: typeof db.community }>(
          "/api/messages/community",
          "POST",
          { text, attachments, mentions, replyToId: replyToId || null },
        );'''
)

# Add exceptions implementations
exceptions_code = '''    deactivateResponsibility: async (id) => {
      const r = stateRef.current.db.responsibilities.find((r) => r.id === id);
      if (r) r.isActive = !r.isActive;
      bump();
    },
    requestException: async (activityId, explanation) => {
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
    },'''
text = text.replace(
    '    deactivateResponsibility: async (id) => {\n      const r = stateRef.current.db.responsibilities.find((r) => r.id === id);\n      if (r) r.isActive = !r.isActive;\n      bump();\n    },',
    exceptions_code
)

with open("src/context/TrakStore.tsx", "w") as f:
    f.write(text)

