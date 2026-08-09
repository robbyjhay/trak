import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { getUser, updateUserProfile, type ProfilePatch } from "@/lib/db/service";
import { jsonError } from "@/lib/api/http";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const user = await getUser(id);
    if (!user) return jsonError(404, "User not found");
    return jsonOk({ user });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const body = await parseJsonBody<ProfilePatch>(req);
    const user = await updateUserProfile(session, id, body);
    return jsonOk({ user });
  } catch (err) {
    return handleServiceError(err);
  }
}
