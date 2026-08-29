import { handleError, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
    return ok({ signedOut: true });
  } catch (error) {
    return handleError(error);
  }
}
