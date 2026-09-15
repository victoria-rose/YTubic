import { describe, expect, it, beforeEach } from "vitest";
import {
  getShareUrl,
  parseDeepLink,
  universalShareUrl,
  ytmusicShareUrl,
  ytubicShareUrl,
} from "./deep-link";
import { useSettingsStore } from "./store/settings";

describe("deep link URLs", () => {
  beforeEach(() => {
    useSettingsStore.setState({ ytubicShareLinks: false });
  });

  it("builds ytubic protocol links", () => {
    expect(ytubicShareUrl("watch", "dQw4w9WgXcQ")).toBe(
      "ytubic://watch?v=dQw4w9WgXcQ",
    );
    expect(ytubicShareUrl("artist", "UC_channel_123")).toBe(
      "ytubic://artist/UC_channel_123",
    );
    expect(ytubicShareUrl("album", "MPREb_album_123")).toBe(
      "ytubic://album/MPREb_album_123",
    );
    expect(ytubicShareUrl("playlist", "PL_playlist_123")).toBe(
      "ytubic://playlist/PL_playlist_123",
    );
  });

  it("builds YouTube Music share URLs", () => {
    expect(ytmusicShareUrl("watch", "dQw4w9WgXcQ")).toBe(
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(ytmusicShareUrl("artist", "UC_channel_123")).toBe(
      "https://music.youtube.com/channel/UC_channel_123",
    );
    expect(ytmusicShareUrl("album", "MPREb_album_123")).toBe(
      "https://music.youtube.com/browse/MPREb_album_123",
    );
    expect(ytmusicShareUrl("playlist", "PL_playlist_123")).toBe(
      "https://music.youtube.com/playlist?list=PL_playlist_123",
    );
    expect(ytmusicShareUrl("playlist", "VLPL_playlist_123")).toBe(
      "https://music.youtube.com/playlist?list=PL_playlist_123",
    );
  });

  it("builds universal share landing page URLs", () => {
    expect(universalShareUrl("watch", "dQw4w9WgXcQ")).toBe(
      "https://nuber-dev.github.io/YTubic/s/?v=dQw4w9WgXcQ",
    );
    expect(
      universalShareUrl("artist", "UC_channel_123", "Rick Astley"),
    ).toBe(
      "https://nuber-dev.github.io/YTubic/s/?artist=UC_channel_123&t=Rick+Astley",
    );
    expect(
      universalShareUrl(
        "album",
        "MPREb_album_123",
        "Whenever You Need Somebody",
        "https://lh3.googleusercontent.com/cover.jpg",
      ),
    ).toBe(
      "https://nuber-dev.github.io/YTubic/s/?album=MPREb_album_123&t=Whenever+You+Need+Somebody&c=https%3A%2F%2Flh3.googleusercontent.com%2Fcover.jpg",
    );
  });

  it("getShareUrl defaults to YouTube Music links", () => {
    expect(useSettingsStore.getState().ytubicShareLinks).toBe(false);
    expect(getShareUrl("watch", "dQw4w9WgXcQ")).toBe(
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(getShareUrl("artist", "UC_channel_123", "Rick Astley")).toBe(
      "https://music.youtube.com/channel/UC_channel_123",
    );
  });

  it("getShareUrl returns universal YTubic links when ytubicShareLinks is true", () => {
    useSettingsStore.setState({ ytubicShareLinks: true });
    expect(getShareUrl("watch", "dQw4w9WgXcQ")).toBe(
      "https://nuber-dev.github.io/YTubic/s/?v=dQw4w9WgXcQ",
    );
    expect(getShareUrl("artist", "UC_channel_123", "Rick Astley")).toBe(
      "https://nuber-dev.github.io/YTubic/s/?artist=UC_channel_123&t=Rick+Astley",
    );
  });

  it("getShareUrl respects manual override parameter", () => {
    useSettingsStore.setState({ ytubicShareLinks: false });
    expect(
      getShareUrl("watch", "dQw4w9WgXcQ", undefined, undefined, true),
    ).toBe("https://nuber-dev.github.io/YTubic/s/?v=dQw4w9WgXcQ");

    useSettingsStore.setState({ ytubicShareLinks: true });
    expect(
      getShareUrl("watch", "dQw4w9WgXcQ", undefined, undefined, false),
    ).toBe("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("parses deep links accurately", () => {
    expect(parseDeepLink("ytubic://watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "watch",
      id: "dQw4w9WgXcQ",
    });
    expect(parseDeepLink("ytubic://artist/UC_channel_123")).toEqual({
      kind: "artist",
      id: "UC_channel_123",
    });
    expect(parseDeepLink("https://example.com")).toBeNull();
  });
});
