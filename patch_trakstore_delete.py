with open("src/context/TrakStore.tsx", "r") as f:
    content = f.read()

old_delete = """    toggleActivityHidden: async (activityId) => {
      await apiSend(`/api/activities/${activityId}`, "PATCH", {
        action: "toggleHidden",
      });
      const act = stateRef.current.db.activities.find((a) => a.id === activityId);
      if (act) act.hidden = !act.hidden;
      bump();
    },
    deactivateResponsibility: async (id) => {"""

new_delete = """    toggleActivityHidden: async (activityId) => {
      await apiSend(`/api/activities/${activityId}`, "PATCH", {
        action: "toggleHidden",
      });
      const act = stateRef.current.db.activities.find((a) => a.id === activityId);
      if (act) act.hidden = !act.hidden;
      bump();
    },
    deleteActivity: async (activityId) => {
      await apiSend(`/api/activities/${activityId}`, "PATCH", {
        action: "softDelete",
      });
      const act = stateRef.current.db.activities.find((a) => a.id === activityId);
      if (act) act.softDeletedAt = new Date().toISOString();
      bump();
    },
    deactivateResponsibility: async (id) => {"""

content = content.replace(old_delete, new_delete)
with open("src/context/TrakStore.tsx", "w") as f:
    f.write(content)
