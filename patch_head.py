import re

with open('src/components/dashboard/HeadDashboard.tsx', 'r') as f:
    content = f.read()

# Add states for delete modal
old_state = """  const [commentOpen, setCommentOpen] = useState(false);"""
new_state = """  const [commentOpen, setCommentOpen] = useState(false);
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
  };
"""

content = content.replace(old_state, new_state)

# Add Delete button in the action row
old_buttons = """                      <UaBtn
                        title={a.hidden ? "Unhide in feed" : "Hide from feed"}
                        onClick={(e) => {"""

new_buttons = """                      {a.status === "missed" && (
                        <UaBtn
                          title="Delete activity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(a.id);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-critical-semantic">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                          </svg>
                          <span className="hidden sm:inline text-critical-semantic">Delete</span>
                        </UaBtn>
                      )}
                      <UaBtn
                        title={a.hidden ? "Unhide in feed" : "Hide from feed"}
                        onClick={(e) => {"""

content = content.replace(old_buttons, new_buttons)

# Add Modal
old_end = """      <ModalBackdrop open={commentOpen} onClose={() => setCommentOpen(false)}>"""
new_end = """      <ModalBackdrop open={!!deleteId} onClose={() => !deleting && setDeleteId(null)}>
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
      
      <ModalBackdrop open={commentOpen} onClose={() => setCommentOpen(false)}>"""

content = content.replace(old_end, new_end)

with open('src/components/dashboard/HeadDashboard.tsx', 'w') as f:
    f.write(content)
