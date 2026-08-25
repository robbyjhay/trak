import { formatRelativeDate } from "@/lib/dates";
import { readSession } from "@/lib/auth/session";
import { queryAuditEvents } from "@/lib/services/audit.service";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Security & Audit Log" };


const humanReadableAction = (action: string) => {
  const map: Record<string, string> = {
    "login": "Signed in",
    "logout": "Signed out",
    "password_changed": "Changed password",
    "member_created": "Created member",
    "preferences_updated": "Updated preferences",
    "default_password_updated": "Updated default password",
    "session_revoked": "Removed device",
  };
  return map[action] || action.replace(/_/g, ' ');
};

const formatTarget = (type: string | null, id: string | null) => {
  if (!type && !id) return "—";
  if (!id) return type || "—";
  if (type === "User") return `Member (${id.slice(0, 8)})`;
  return `${type} (${id.slice(0, 8)})`;
};

export default async function AuditLogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const session = await readSession();
  if (!session || session.role !== "head") {
    redirect("/dashboard");
  }

  const page = parseInt((searchParams.page as string) || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  const actionFilter = (searchParams.action as any) || undefined;

  const result = await queryAuditEvents({ limit, offset, action: actionFilter });

  const totalPages = Math.ceil(result.total / limit);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="mb-1 font-display text-[20px] font-semibold">Security & Audit Log</h2>
          <p className="text-[13.5px] text-muted-foreground">
            Review security events and administrative actions.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.events.map((evt) => (
                <tr key={evt.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatRelativeDate(evt.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {evt.user ? (
                      <span className="font-medium">{evt.user.username}</span>
                    ) : (
                      <span className="text-muted-foreground italic">System</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                      {humanReadableAction(evt.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatTarget(evt.targetType, evt.targetId)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {evt.ipAddress || "—"}
                  </td>
                </tr>
              ))}
              {result.events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <Link
              href={`?page=${Math.max(page - 1, 1)}`}
              className={`px-3 py-1.5 text-sm font-medium rounded border border-border bg-background hover:bg-secondary ${
                page <= 1 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Previous
            </Link>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Link
              href={`?page=${Math.min(page + 1, totalPages)}`}
              className={`px-3 py-1.5 text-sm font-medium rounded border border-border bg-background hover:bg-secondary ${
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
