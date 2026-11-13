import { profileRole } from "@/lib/db/schema";

export const roles = profileRole.enumValues;
export type Role = (typeof roles)[number];

/** The signed-in person making a request. Role always comes from the database. */
export type Actor = { id: string; role: Role };

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (roles as readonly string[]).includes(value);
}
