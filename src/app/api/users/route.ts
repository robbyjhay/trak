import { createUser, type NewUserInput } from "@/lib/db/service";
import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const body = await parseJsonBody<NewUserInput>(req);
    const { user, credentials } = await createUser(session, body);
    return jsonOk({ user, credentials });
  } catch (err) {
    return handleServiceError(err);
  }
}
