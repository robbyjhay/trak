import { describe, it, expect } from "vitest";
import { extractFirstUrl, fetchLinkPreview, fetchYouTubeMeta, extractYouTubeVideoId } from "@/lib/link-preview";
import { parseTextWithLinks } from "@/lib/mention-utils";

describe("link preview extraction", () => {
  it("extracts the first URL from text", () => {
    expect(extractFirstUrl("Check this out https://example.com now")).toBe("https://example.com/");
    expect(extractFirstUrl("No link here")).toBeNull();
    expect(extractFirstUrl("a.test only")).toBeNull();
  });

  it("handles trailing punctuation", () => {
    expect(extractFirstUrl("see https://example.com/page.) now")).toBe("https://example.com/page");
  });

  it("parses text into clickable link segments", () => {
    const segs = parseTextWithLinks("Hi https://example.com bye");
    expect(segs).toEqual([
      { type: "text", value: "Hi " },
      { type: "link", value: "https://example.com", url: "https://example.com/" },
      { type: "text", value: " bye" },
    ]);
  });

  it("returns no links for URL-free text", () => {
    expect(parseTextWithLinks("just text")).toEqual([{ type: "text", value: "just text" }]);
  });

  it.skip("extracts og metadata from a real page", async () => {
    const preview = await fetchLinkPreview("https://example.com/");
    expect(preview).not.toBeNull();
    expect(preview!.domain).toBe("example.com");
    expect(preview!.url).toBe("https://example.com/");
  }, 15000);

  it("returns null for unreachable URLs", async () => {
    const preview = await fetchLinkPreview("https://invalid.invalid.example-nope-12345.com/");
    expect(preview).toBeNull();
  }, 15000);
});

describe("youtube link preview", () => {
  it("extracts a video id from youtube.com/watch URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts a video id from youtu.be short URL", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts a video id from shorts and embed URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube URLs and malformed ids", () => {
    expect(extractYouTubeVideoId("https://example.com/watch?v=abc")).toBeNull();
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=too-short")).toBeNull();
  });

  it.skip("fetches title and thumbnail via the dedicated YouTube path", async () => {
    const meta = await fetchYouTubeMeta("dQw4w9WgXcQ");
    expect(meta).not.toBeNull();
    expect(meta!.title).toContain("Rick Astley");
    expect(meta!.thumbnail).toMatch(/^https:\/\/(i\.)?ytimg\.com/);
  }, 15000);

  it("builds a full preview card for a youtube.com/watch URL", async () => {
    const preview = await fetchLinkPreview("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(preview).not.toBeNull();
    expect(preview!.domain).toBe("YouTube");
    expect(preview!.title).toContain("Rick Astley");
    expect(preview!.image).toMatch(/^https:\/\/(i\.)?ytimg\.com/);
  }, 15000);

  it("builds a full preview card for a youtu.be URL", async () => {
    const preview = await fetchLinkPreview("https://youtu.be/dQw4w9WgXcQ");
    expect(preview).not.toBeNull();
    expect(preview!.domain).toBe("YouTube");
    expect(preview!.title).toContain("Rick Astley");
    expect(preview!.image).toMatch(/^https:\/\/(i\.)?ytimg\.com/);
  }, 15000);
});
