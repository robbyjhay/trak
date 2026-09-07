import re

with open('src/components/activity/ActRow.tsx', 'r') as f:
    content = f.read()

# Add onDelete prop
old_props = """export function ActRow({
  activity,
  onReport,
  hideStatus,
  index = 0,
}: {
  activity: Activity;
  onReport?: (id: string) => void;
  hideStatus?: boolean;
  index?: number;
}) {"""

new_props = """export function ActRow({
  activity,
  onReport,
  onDelete,
  hideStatus,
  index = 0,
}: {
  activity: Activity;
  onReport?: (id: string) => void;
  onDelete?: (id: string) => void;
  hideStatus?: boolean;
  index?: number;
}) {"""

content = content.replace(old_props, new_props)

# Add delete button before the > icon
old_buttons = """        {a.status === "completed" && onReport && (
          <button
            type="button"
            title="Preview & download report"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-border bg-surface text-foreground-secondary hover:border-primary hover:bg-surface-hover hover:text-primary opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onReport(a.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.download} />
            </svg>
          </button>
        )}
        <div className="shrink-0 text-foreground-faint">"""

new_buttons = """        {a.status === "completed" && onReport && (
          <button
            type="button"
            title="Preview & download report"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-border bg-surface text-foreground-secondary hover:border-primary hover:bg-surface-hover hover:text-primary opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onReport(a.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.download} />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            title="Delete activity"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-border bg-surface text-critical-semantic hover:border-critical-semantic hover:bg-critical-surface hover:text-critical opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(a.id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
        <div className="shrink-0 text-foreground-faint">"""

content = content.replace(old_buttons, new_buttons)

with open('src/components/activity/ActRow.tsx', 'w') as f:
    f.write(content)
