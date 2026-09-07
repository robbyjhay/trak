const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/i;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  if (!match) return null;
  let url = match[0].replace(/[.,;:!?)]+$/, "");
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function isYouTubeHost(hostname: string): boolean {
  return YOUTUBE_HOSTS.has(hostname.toLowerCase());
}

/**
 * Extract a YouTube video ID from a URL, or null if it isn't a YouTube video URL.
 * Supports youtube.com/watch?v=, youtu.be/ID, /shorts/, /embed/, /live/.
 */
export function extractYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  if (host !== "youtube.com" && host !== "youtu.be" && host !== "music.youtube.com") {
    return null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\//, "").split("/")[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (parsed.pathname.startsWith("/watch")) {
    const id = parsed.searchParams.get("v");
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  for (const prefix of ["/shorts/", "/embed/", "/live/"]) {
    if (parsed.pathname.startsWith(prefix)) {
      const id = parsed.pathname.slice(prefix.length).split("/")[0].split("?")[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
  }

  return null;
}

interface YouTubeMeta {
  title?: string;
  description?: string;
  thumbnail?: string;
}

/**
 * Fetch lightweight metadata for a YouTube video via the public oEmbed API,
 * falling back to the standard i.ytimg.com thumbnail when needed.
 */
export async function fetchYouTubeMeta(videoId: string): Promise<YouTubeMeta | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TrakBot/1.0; +https://trak.app)" },
      },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    const thumbnail = data.thumbnail_url?.startsWith("http")
      ? data.thumbnail_url
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      title: data.title,
      description: data.author_name ? `Video by ${data.author_name}` : undefined,
      thumbnail,
    };
  } catch {
    clearTimeout(timeout);
    return {
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

export interface LinkPreviewData {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  image?: string;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");

    // Dedicated YouTube handling: use oEmbed + thumbnail instead of the heavy
    // JS-dependent watch page, whose Open Graph tags sit deep in the HTML and
    // are unreliable to parse server-side.
    if (isYouTubeHost(parsed.hostname)) {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        const meta = await fetchYouTubeMeta(videoId);
        if (meta) {
          return {
            url,
            domain: "YouTube",
            title: meta.title,
            description: meta.description,
            image: meta.thumbnail,
          };
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TrakBot/1.0; +https://trak.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    const html = await res.text();
    // Scan a generous slice — some sites (e.g. YouTube) place Open Graph tags
    // very deep in the document, well beyond a small head-only prefix.
    const chunk = html.slice(0, 1_500_000);

    let title = extractMeta(chunk, "og:title") || extractMeta(chunk, "twitter:title");
    let description = extractMeta(chunk, "og:description") || extractMeta(chunk, "twitter:description") || extractMeta(chunk, "description");
    let image = extractMeta(chunk, "og:image") || extractMeta(chunk, "twitter:image");

    if (!title) {
      const titleMatch = chunk.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) title = titleMatch[1].trim();
    }

    if (image) {
      try {
        const imgParsed = new URL(image, url);
        image = imgParsed.href;
      } catch {
        image = null;
      }
    }

    if (!title && !description && !image) return null;

    return {
      url,
      domain,
      title: title ? title.slice(0, 512) : undefined,
      description: description ? description.slice(0, 1000) : undefined,
      image: image ?? undefined,
    };
  } catch {
    return null;
  }
}
