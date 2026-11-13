import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { helpRequests, profiles } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { helpRequestColumns, helpRequestView } from "@/lib/auth/help-request-view";
import { parseId } from "@/lib/auth/params";
import { canViewHelpRequest } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";

/** One help request with the assistant's summary. The learner who asked, helpers, and admins. */
export const GET = withErrors(
  async (_request: Request, ctx: RouteContext<"/api/help-requests/[id]">) => {
    const actor = await requireActor();
    const id = parseId((await ctx.params).id);

    const [row] = await getDb()
      .select(helpRequestColumns)
      .from(helpRequests)
      .leftJoin(profiles, eq(profiles.id, helpRequests.profileId))
      .where(eq(helpRequests.id, id));
    if (!row) throw new NotFoundError();

    authorize(canViewHelpRequest(actor, row));
    return Response.json({ helpRequest: helpRequestView(actor, row) });
  },
);
