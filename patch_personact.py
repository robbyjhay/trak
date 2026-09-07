import re

with open('src/components/activity/PersonActivities.tsx', 'r') as f:
    content = f.read()

# Add imports
old_imports = """import { PrimaryBtn } from "@/components/ui/Buttons";
import { PATHS } from "@/components/icons";
import { useReportPreview } from "@/components/reports/ReportPreview";"""

new_imports = """import { PrimaryBtn } from "@/components/ui/Buttons";
import { PATHS } from "@/components/icons";
import { useReportPreview } from "@/components/reports/ReportPreview";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";"""

content = content.replace(old_imports, new_imports)

# Add state and handle functions
old_state = """  const [tab, setTab] = useState<"pending" | "completed" | "missed">("pending");"""

new_state = """  const [tab, setTab] = useState<"pending" | "completed" | "missed">("pending");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { deleteActivity } = useTrak();
  
  const handleConfirmDelete = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      await deleteActivity(deleteId);
      showToast("Activity deleted", "The activity was permanently removed.");
      setDeleteId(null);
    } catch (e: any) {
      showToast("Could not delete", typeof e?.message === "string" ? e.message : "Please try again.");
    } finally {
      setDeleting(false);
    }
  };"""

content = content.replace(old_state, new_state)

# Update ActRow rendering inside missed tab
# The rendering of missed tab:
#             items.map((a, idx) => (
#               <div key={a.id} className="flex flex-col gap-2">
#                 <ActRow key={a.id} activity={a} onReport={openReport} hideStatus={tab === "completed"} index={idx} />
# ...

old_render = """              <div key={a.id} className="flex flex-col gap-2">
                <ActRow key={a.id} activity={a} onReport={openReport} hideStatus={tab === "completed"} index={idx} />"""

new_render = """              <div key={a.id} className="flex flex-col gap-2">
                <ActRow 
                  key={a.id} 
                  activity={a} 
                  onReport={openReport} 
                  onDelete={tab === "missed" && isHead ? () => setDeleteId(a.id) : undefined}
                  hideStatus={tab === "completed"} 
                  index={idx} 
                />"""

content = content.replace(old_render, new_render)

# Add modal at the end before closing div
old_end = """      </div>
    </div>
  );
}"""

new_end = """      </div>
      <ModalBackdrop open={!!deleteId} onClose={() => !deleting && setDeleteId(null)}>
        <ModalPanel>
          <div className="mb-4">
            <h3 className="m-0 text-lg font-bold text-foreground">Delete this activity?</h3>
            <p className="mt-2 text-sm text-foreground-secondary">
              This action will permanently remove the activity and its associated data. This cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-bold text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="cursor-pointer rounded-lg bg-critical px-4 py-2 text-sm font-bold text-critical-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </ModalPanel>
      </ModalBackdrop>
    </div>
  );
}"""

content = content.replace(old_end, new_end)

with open('src/components/activity/PersonActivities.tsx', 'w') as f:
    f.write(content)
