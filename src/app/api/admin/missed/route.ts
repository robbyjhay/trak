import { requireSession } from "@/lib/api/http";
import { markActivitiesMissed } from "@/lib/db/service";

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    await markActivitiesMissed();
    return new Response(
      JSON.stringify({ success: true, message: "Activities marked as missed." }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[api/admin/missed]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}