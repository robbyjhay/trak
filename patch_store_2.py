import re

with open('src/context/TrakStore.tsx', 'r') as f:
    content = f.read()

# Add to context type
old_type = """  toggleActivityHidden: (id: string) => Promise<void>;
  updateActivityEndDate: (id: string, endDate: string) => Promise<void>;"""

new_type = """  toggleActivityHidden: (id: string) => Promise<void>;
  updateActivityEndDate: (id: string, endDate: string) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;"""

content = content.replace(old_type, new_type)

old_impl = """    updateActivityEndDate: async (activityId, endDate) => {
      const act = await apiSend<Activity>(`/api/activities/${activityId}`, "PATCH", { action: "updateDates", endDate });
      mutate((draft) => {
        const idx = draft.activities.findIndex((a) => a.id === activityId);
        if (idx !== -1) draft.activities[idx] = act;
      });
    },"""

new_impl = """    updateActivityEndDate: async (activityId, endDate) => {
      const act = await apiSend<Activity>(`/api/activities/${activityId}`, "PATCH", { action: "updateDates", endDate });
      mutate((draft) => {
        const idx = draft.activities.findIndex((a) => a.id === activityId);
        if (idx !== -1) draft.activities[idx] = act;
      });
    },
    deleteActivity: async (id) => {
      await apiSend<{ success: true }>(`/api/activities/${id}`, "DELETE");
      mutate((draft) => {
        draft.activities = draft.activities.filter((a) => a.id !== id);
      });
    },"""

content = content.replace(old_impl, new_impl)

with open('src/context/TrakStore.tsx', 'w') as f:
    f.write(content)
