import "server-only";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { getAdminSecret } from "@/lib/env-admin";

export async function isAdminSessionActive(): Promise<boolean> {
  if (!getAdminSecret()) return false;
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!raw) return false;
  return verifyAdminSessionToken(raw);
}
