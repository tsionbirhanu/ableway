import { z } from "zod";
import { BadRequestError, NotFoundError, PayloadTooLargeError } from "./errors";

const uuid = z.uuid();

/** Route ids must be UUIDs. Anything else is a 404, before we touch the database. */
export function parseId(value: string): string {
  const result = uuid.safeParse(value);
  if (!result.success) throw new NotFoundError();
  return result.data;
}

/** Default size limit for JSON bodies. Routes can set their own with withApi({ maxBodyBytes }). */
export const DEFAULT_MAX_JSON_BYTES = 64 * 1024;

const bodyLimits = new WeakMap<Request, number>();

/** Called by withApi so readJson/readBodyBytes know this route's limit. */
export function setBodyLimit(request: Request, maxBytes: number): void {
  bodyLimits.set(request, maxBytes);
}

export function bodyLimitFor(request: Request): number {
  return bodyLimits.get(request) ?? DEFAULT_MAX_JSON_BYTES;
}

/**
 * Read the whole body, but stop with 413 as soon as it passes `maxBytes`.
 * Works when Content-Length is missing or wrong (chunked uploads), so a
 * client cannot make the server buffer an unbounded body.
 */
export async function readBodyBytes(
  request: Request,
  maxBytes: number = bodyLimitFor(request),
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError();
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Read a JSON body within the route's size limit. Bad JSON is a 400, not a 500. */
export async function readJson(request: Request): Promise<unknown> {
  const bytes = await readBodyBytes(request);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new BadRequestError();
  }
}

/** Parse query string parameters with a strict schema (unknown parameters are rejected). */
export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(new URL(request.url).searchParams));
}
