import { resetAuthCache } from "./shared";

/**
 * The whole InnerTube data layer is the hand-rolled raw-POST client in
 * `shared.ts`. A youtubei.js singleton used to live here too, but it was
 * dead code — every importer only ever used `resetInnertube` — and pulling
 * it in dragged the entire youtubei.js parser (~270 KB) into the bundle and
 * kept a second, drift-prone cookie cache. It has been removed.
 *
 * `resetInnertube` is kept as the stable name callers use after sign-in /
 * sign-out; it just drops the raw client's cached auth cookies so the next
 * request picks up the fresh jar.
 */
export function resetInnertube() {
  resetAuthCache();
}
