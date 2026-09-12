import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang } from "./site-lang";

/** The reader's site language, for server components. Hindi when unset. */
export function getSiteLang() {
  return normalizeLang(cookies().get(LANG_COOKIE)?.value);
}
