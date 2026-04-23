#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { YoutubeTranscript } from "youtube-transcript-plus";

// Simple decoding of common HTML and numeric entities
function decodeHtmlEntities(raw: string): string {
  if (!raw || !raw.includes('&')) return raw;
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // decimal numeric entities
    .replace(/&#(\d+);/g, (_, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; }
    })
    // hexadecimal numeric entities
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; }
    });
}

// Clean certain encoding artifacts (e.g., corrupted sequences like ÔÖ¬) when they repeat
// Common glitch sequences from poorly decoded subtitles (UTF-8 interpreted as Latin1)
function normalizeGlitches(text: string): string {
  // Common glitched sequences from badly decoded subtitles (UTF-8 interpreted as Latin1)
  const replacements: { pattern: RegExp; sub: string }[] = [
    /ÔÖ¬+/g,        // Observed in sample output
    /â™ª+/g,        // Common variant of badly decoded ♪ symbol
    /â™«+/g,        // Variant of ♫ symbol (double note)
    /Ã©/g,          // é
    /Ã¨/g,          // è
    /Ãª/g,          // ê
    /Ã«/g,          // ë
    /Ã /g,          // à (note the space)
    /Ã¹/g,          // ù
    /Ã´/g,          // ô
    /Ã®/g,          // î
    /Ã¯/g,          // ï
    /Ã«/g,          // ë
    /Â·/g,          // · (middle dot)
  ].map(p => ({ pattern: p, sub: '♪' }));
  let out = text;
  for (const { pattern, sub } of replacements) out = out.replace(pattern, sub);
  // Collapse contiguous ♪ symbols
  out = out.replace(/♪{2,}/g, '♪');
  return out.trim();
}

/** Robust extraction of video ID from various URL formats or direct ID */
function extractVideoId(input: string): string | null {
  if (!input) return null;
  // Already a likely ID (11 alnum chars + _ -)
  if (/^[\w-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input.trim());
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1) || null;
    }
    if (url.searchParams.get("v")) {
      return url.searchParams.get("v");
    }
    // /embed/VIDEOID or /v/VIDEOID formats
    const m = url.pathname.match(/\/(embed|v)\/([\w-]{11})/);
    if (m) return m[2];
  } catch {
    // Not a valid URL, retry with global pattern
    const m = input.match(/([\w-]{11})/);
    if (m) return m[1];
  }
  return null;
}

/** Fetches the transcript (with optional language fallback) */
async function fetchTranscript(
  videoId: string,
  languages?: string[]
) {
  try {
    if (languages && languages.length > 0) {
      // Try in the provided order
      for (const lang of languages) {
        try {
          const t = await YoutubeTranscript.fetchTranscript(videoId, { lang });
          if (t && t.length) return t;
        } catch {
          // on continue
        }
      }
    }
    // Fallback auto
    return await YoutubeTranscript.fetchTranscript(videoId);
  } catch (e) {
    throw new Error(
      `Failed to fetch transcript for ${videoId}: ${e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

// Added: timestamp formatting and safe chunking helpers
function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}]`
    : `[${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}]`;
}

function buildLinesFromSegments(
  segments: Array<{ text: string; duration?: number; offset?: number; start?: number }>,
  includeTimestamps: boolean,
  decodeHtml: (s: string) => string
): string[] {
  return segments.map(seg => {
    const startSec = (seg.offset ?? seg.start ?? 0);
    const clean = decodeHtml(seg.text || '');
    return includeTimestamps ? `${formatTimestamp(startSec)} ${clean}` : clean;
  });
}

function chunkLinesByChars(lines: string[], maxCharsPerChunk: number): string[][] {
  if (!maxCharsPerChunk || maxCharsPerChunk <= 0) return [lines]; // no chunking
  const max = Math.min(20000, Math.max(500, Math.floor(maxCharsPerChunk))); // clamp
  const chunks: string[][] = [];
  let buf: string[] = [];
  let len = 0;
  for (const line of lines) {
    const lineLen = line.length + 1; // + newline
    if (len > 0 && len + lineLen > max) {
      chunks.push(buf);
      buf = [];
      len = 0;
    }
    buf.push(line);
    len += lineLen;
  }
  if (buf.length) chunks.push(buf);
  return chunks;
}

/** Concatenate/format transcript into plain text or with timestamps */
function formatTranscript(
  items: { text: string; offset?: number; duration?: number }[],
  includeTimestamps: boolean
): string {
  return items
    .map((seg) => {
      const clean = normalizeGlitches(decodeHtmlEntities(seg.text));
      if (!includeTimestamps) return clean;
      const seconds = (seg.offset || 0) / 1000;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ts =
        (h > 0 ? `${h}:` : "") +
        `${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`;
      return `[${ts}] ${clean}`;
    })
    .join("\n");
}

/** Splits long text into chunks (multiple MCP content) */
function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + max));
    start += max;
  }
  return chunks;
}

// Create server with the new API
const server = new Server(
  {
    name: "gc-youtube-transcript",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler to list available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "youtube_transcript",
        description: "Extracts/Fetches and retrieves YouTube video transcripts/captions with intelligent language selection and automatic chunking. Supports multiple URL formats, handles encoding issues, and provides timestamps for navigation. Automatically tries English first, then falls back to available languages or user preferences. Returns content in manageable chunks suitable for analysis, summarization, or processing.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Full YouTube URL (optional if video_id provided)"
            },
            video_id: {
              type: "string",
              description: "Direct video ID (optional if url provided)"
            },
            languages: {
              type: "array",
              items: { type: "string" },
              description: "List of language codes to try (e.g., ['en','fr','es','zh','de','pt','ja']). Priority order."
            },
            include_timestamps: {
              type: "boolean",
              default: false,
              description: "Include timestamps (false by default)"
            },
            max_chars_per_chunk: {
              type: "number",
              minimum: 0,
              maximum: 20000,
              default: 6000,
              description: "Default 6000 chars per chunk; set 0 to disable. Range: 0 or 500–20000"
            }
          }
        }
      },
      {
        name: "youtube_available_languages",
        description: "Lists estimated available languages for a video",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Full URL (optional if video_id provided)"
            },
            video_id: {
              type: "string",
              description: "Direct video ID (optional if url provided)"
            }
          }
        }
      }
    ]
  };
});

// Handler to execute tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (name === "youtube_transcript") {
      // Robust parameter handling with defaults
      const {
        url,
        video_id,
        languages,
        include_timestamps,
        max_chars_per_chunk,
      } = args as any;

      // Required default parameters
      const includeTimestamps = include_timestamps === true ? true : false; // Default: false
      const maxCharsPerChunk = typeof max_chars_per_chunk === 'number' && max_chars_per_chunk >= 0
        ? Math.min(20000, Math.max(max_chars_per_chunk === 0 ? 0 : Math.max(500, max_chars_per_chunk)))
        : 6000; // Default: 6000

      const source = url || video_id;
      if (!source) {
        return {
          content: [
            { type: "text", text: "Error: Must specify either 'url' or 'video_id' parameter." },
          ],
          isError: true,
        };
      }

      const vid = extractVideoId(source);
      if (!vid) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Unable to extract valid YouTube video ID from: ${source}. Please check the URL format or provide a valid 11-character video ID.`,
            },
          ],
          isError: true,
        };
      }

      try {
        const transcript = await fetchTranscript(vid, languages);
        if (!transcript || transcript.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Error: No transcript available for video ${vid}. This could be because:\n- The video has no captions/subtitles\n- The video is private or unavailable\n- The requested language is not available\n- Captions are disabled by the creator`
              },
            ],
            isError: true,
          };
        }

        const lines = buildLinesFromSegments(transcript as any, includeTimestamps, decodeHtmlEntities);
        const chunks = chunkLinesByChars(lines, maxCharsPerChunk);
        const texts = chunks.map(chunkLines => chunkLines.join('\n'));

        return {
          content: texts.map(t => ({ type: 'text', text: t })),
        };

      } catch (transcriptError) {
        const errorMessage = transcriptError instanceof Error ? transcriptError.message : String(transcriptError);
        let detailedError = `Error fetching transcript for video ${vid}: ${errorMessage}`;

        // Common specific errors
        if (errorMessage.includes('Video unavailable')) {
          detailedError += '\n- The video may be private, unlisted, or removed';
        } else if (errorMessage.includes('Transcript disabled')) {
          detailedError += '\n- Captions/subtitles are disabled for this video';
        } else if (errorMessage.includes('No transcript')) {
          detailedError += '\n- No captions available in any language for this video';
        } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          detailedError += '\n- Network connectivity issue, please try again';
        }

        return {
          content: [
            { type: "text", text: detailedError },
          ],
          isError: true,
        };
      }
    }

    if (name === "youtube_available_languages") {
      const { url, video_id } = args as any;

      const source = url || video_id;
      if (!source) {
        return {
          content: [
            { type: "text", text: "Error: Must specify either 'url' or 'video_id' parameter." }
          ],
          isError: true,
        };
      }

      const vid = extractVideoId(source);
      if (!vid) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Unable to extract valid YouTube video ID from: ${source}. Please check the URL format.`,
            },
          ],
          isError: true,
        };
      }

      try {
        const probe = [
          "en", "en-US", "fr", "es", "zh", "zh-CN", "zh-TW", "de", "it", "pt", "pt-BR",
          "ru", "ja", "ko", "ar", "hi", "zh-HK"
        ];

        const available: string[] = [];
        for (const lang of probe) {
          try {
            const res = await YoutubeTranscript.fetchTranscript(vid, { lang });
            if (res && res.length) available.push(lang);
          } catch {
            // Continue testing other languages
          }
        }

        if (available.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No tested languages found for video ${vid}. The video may have auto-generated captions only, or no captions at all. Try using the main transcript tool without specifying a language.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Available languages for video ${vid}: ${available.join(", ")}\n\nNote: This is a heuristic test of common languages. Other languages may also be available.`,
            },
          ],
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error checking available languages for video ${vid}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: "text", text: `Error: Unknown tool '${name}'. Available tools: youtube_transcript, youtube_available_languages` }],
      isError: true,
    };

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      content: [
        {
          type: "text",
          text: `Unexpected error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Removed console.error which can interfere with Dive
  // console.error("YouTube Transcript MCP Server is running (stdio)");
}

main().catch((err) => {
  // Log error elsewhere, not on stderr, to avoid breaking MCP
  // Server should remain alive even if initialization fails
});