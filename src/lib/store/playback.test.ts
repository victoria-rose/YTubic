import { beforeEach, describe, expect, it } from "vitest";
import type { PlaybackState, QueueTrack } from "@/lib/store/playback";

// The store decides at import time whether to wrap itself in
// zustand/persist (main window) or stay plain (floating mirror).
// Present ourselves as the floating window so construction skips
// persist + localStorage (which isn't available under the node test
// env). `next()` — the reducer under test — is identical in both
// variants, so this only sidesteps the storage plumbing.
(globalThis as unknown as { window: unknown }).window = {
  location: { search: "?floating-player" },
};

const { usePlaybackStore } = await import("@/lib/store/playback");

function track(videoId: string): QueueTrack {
  return { videoId, title: videoId, thumbnails: [] };
}

/** Reset to a known "mid-playback" baseline, then apply the overrides. */
function setup(partial: Partial<PlaybackState>): void {
  usePlaybackStore.setState({
    queue: [],
    index: -1,
    repeat: "off",
    shuffle: false,
    playing: true,
    status: "ready",
    streamUrl: "blob:prev",
    position: 42,
    pendingSeek: undefined,
    ...partial,
  });
}

describe("playback next()", () => {
  beforeEach(() => setup({}));

  it("replays the current track in place for repeat-one", () => {
    setup({ queue: [track("a"), track("b")], index: 0, repeat: "one" });
    usePlaybackStore.getState().next();
    const s = usePlaybackStore.getState();
    expect(s.index).toBe(0);
    expect(s.pendingSeek).toBe(0);
    expect(s.position).toBe(0);
    expect(s.playing).toBe(true);
  });

  it("replays in place for repeat-all on a single-track queue", () => {
    // Regression: wrapping a length-1 queue lands on the same index, so
    // the "loading" path never restarts the (already-ended) element and
    // playback used to stall on the loader — the "first click does
    // nothing" bug. It must route through pendingSeek like repeat-one.
    setup({
      queue: [track("a")],
      index: 0,
      repeat: "all",
      status: "ready",
      streamUrl: "blob:a",
    });
    usePlaybackStore.getState().next();
    const s = usePlaybackStore.getState();
    expect(s.index).toBe(0);
    expect(s.pendingSeek).toBe(0);
    expect(s.playing).toBe(true);
    // Must NOT take the load path (which would stall on a same-index track).
    expect(s.status).not.toBe("loading");
    expect(s.streamUrl).toBe("blob:a");
  });

  it("wraps a multi-track queue back to the first track for repeat-all", () => {
    setup({ queue: [track("a"), track("b")], index: 1, repeat: "all" });
    usePlaybackStore.getState().next();
    const s = usePlaybackStore.getState();
    expect(s.index).toBe(0);
    expect(s.status).toBe("loading");
    expect(s.streamUrl).toBeUndefined();
    expect(s.pendingSeek).toBeUndefined();
    expect(s.playing).toBe(true);
  });

  it("stops at the end of the queue when repeat is off", () => {
    setup({ queue: [track("a"), track("b")], index: 1, repeat: "off" });
    usePlaybackStore.getState().next();
    const s = usePlaybackStore.getState();
    expect(s.index).toBe(1);
    expect(s.playing).toBe(false);
    expect(s.position).toBe(0);
  });

  it("advances to the next track mid-queue", () => {
    setup({
      queue: [track("a"), track("b"), track("c")],
      index: 0,
      repeat: "off",
    });
    usePlaybackStore.getState().next();
    const s = usePlaybackStore.getState();
    expect(s.index).toBe(1);
    expect(s.status).toBe("loading");
    expect(s.playing).toBe(true);
  });

  it("is a no-op on an empty queue", () => {
    setup({ queue: [], index: -1, repeat: "all", playing: false });
    usePlaybackStore.getState().next();
    expect(usePlaybackStore.getState().index).toBe(-1);
  });
});
