import { describe, expect, it } from "vitest";
import { parseTrackCount } from "@/lib/innertube/parse-count";

describe("parseTrackCount", () => {
  it("parses a plain count", () => {
    expect(parseTrackCount("12 songs • 45 minutes")).toBe(12);
  });

  it("handles a thousands separator (the regression)", () => {
    expect(parseTrackCount("5,000 songs")).toBe(5000);
    expect(parseTrackCount("1,234 songs")).toBe(1234);
  });

  it("matches the singular 'song'", () => {
    expect(parseTrackCount("1 song")).toBe(1);
  });

  it("is case-insensitive", () => {
    expect(parseTrackCount("42 Songs")).toBe(42);
  });

  it("returns undefined when there is no count", () => {
    expect(parseTrackCount("Playlist • Various artists")).toBeUndefined();
    expect(parseTrackCount("")).toBeUndefined();
  });
});
