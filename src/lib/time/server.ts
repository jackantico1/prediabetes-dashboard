import "server-only";
import { cookies } from "next/headers";
import { isValidTimeZone } from "./index";

export async function getUserTimeZone(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return isValidTimeZone(tz) ? tz : "UTC";
}
