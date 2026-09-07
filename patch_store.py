import re

with open('src/context/TrakStore.tsx', 'r') as f:
    content = f.read()

# Add to context type
old_type = """  toggleActivityHidden: (id: string) => Promise<void>;
  updateActivityDates: (id: string, endDate: string) => Promise<void>;"""

new_type = """  toggleActivityHidden: (id: string) => Promise<void>;
  updateActivityDates: (id: string, endDate: string) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;"""

content = content.replace(old_type, new_type)

# Add implementation
old_impl = """    updateActivityDates: async (id, endDate) => {
      const act = await apiSend<Activity>(`/api/activities/${id}`, "PATCH", { action: "updateDates", endDate });
      mutate((draft) => {
        const i = draft.activities.findIndex((a) => a.id === id);
        if (i !== -1) draft.activities[i] = act;
      });
    },"""

new_impl = """    updateActivityDates: async (id, endDate) => {
      const act = await apiSend<Activity>(`/api/activities/${id}`, "PATCH", { action: "updateDates", endDate });
      mutate((draft) => {
        const i = draft.activities.findIndex((a) => a.id === id);
        if (i !== -1) draft.activities[i] = act;
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
