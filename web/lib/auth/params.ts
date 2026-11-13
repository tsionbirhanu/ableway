import { z } from "zod";
import { BadRequestError, NotFoundError } from "./errors";

const uuid = z.uuid();

/** Route ids must be UUIDs. Anything else is a 404, before we touch the database. */
export function parseId(value: string): string {
  const result = uuid.safeParse(value);
  if (!result.success) throw new NotFoundError();
  return result.data;
}

/** Read a JSON body. Bad JSON is a 400, not a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError();
  }
}
