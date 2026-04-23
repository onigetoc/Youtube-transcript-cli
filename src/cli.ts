#!/usr/bin/env node
// Quick CLI to fetch a transcript without going through MCP.
// Usage: node build/cli.js [<url|videoId>] [--lang en,fr] [--timestamps] [--max 8000]
// If no first argument is provided (or it starts with --), use the default video.
// Default test video: https://www.youtube.com/watch?v=dQw4w9WgXcQ

const DEFAULT_VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

import { YoutubeTranscript } from 'youtube-transcript-plus';

function decodeHtmlEntities(raw: string): string {
	if (!raw || !raw.includes('&')) return raw;
	return raw
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d,10)); } catch { return _; } })
		.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h,16)); } catch { return _; } });
}

function normalizeGlitches(text: string): string {
	const patterns = [
		/ÔÖ¬+/g,
		/â™ª+/g,
		/â™«+/g,
		/Ã©/g,
		/Ã¨/g,
		/Ãª/g,
		/Ã«/g,
		/Ã /g,
		/Ã¹/g,
		/Ã´/g,
		/Ã®/g,
		/Ã¯/g,
		/Â·/g
	];
	let out = text;
	for (const p of patterns) out = out.replace(p, '♪');
	out = out.replace(/♪{2,}/g, '♪');
	return out.trim();
}

function extractVideoId(input: string): string | null {
	if (!input) return null;
	if (/^[\w-]{11}$/.test(input)) return input;
	try {
		const url = new URL(input.trim());
		if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
		if (url.searchParams.get('v')) return url.searchParams.get('v');
		const m = url.pathname.match(/\/(embed|v)\/([\w-]{11})/);
		if (m) return m[2];
	} catch {
		const m = input.match(/([\w-]{11})/);
		if (m) return m[1];
	}
	return null;
}

async function fetchTranscript(videoId: string, languages?: string[]) {
	if (languages && languages.length) {
		for (const lang of languages) {
			try {
				const t = await YoutubeTranscript.fetchTranscript(videoId, { lang });
				if (t?.length) return t;
			} catch {}
		}
	}
	return YoutubeTranscript.fetchTranscript(videoId);
}

function format(items: any[], includeTs: boolean): string {
	return items.map(seg => {
		const clean = normalizeGlitches(decodeHtmlEntities(seg.text));
		if (!includeTs) return clean;
		const seconds = (seg.offset || 0) / 1000;
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		const ts = (h>0? `${h}:`:'') + `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
		return `[${ts}] ${clean}`;
	}).join('\n');
}

function chunk(text: string, max: number){
	if (text.length <= max) return [text];
	const out: string[] = []; let i=0;
	while(i<text.length){ out.push(text.slice(i,i+max)); i+=max; }
	return out;
}

// keep helpers local (avoid new files)
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
  if (!maxCharsPerChunk || maxCharsPerChunk <= 0) return [lines];
  const max = Math.min(20000, Math.max(500, Math.floor(maxCharsPerChunk)));
  const chunks: string[][] = [];
  let buf: string[] = [];
  let len = 0;
  for (const line of lines) {
    const lineLen = line.length + 1;
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

// Small CLI flags parser: --timestamps, --max, --lang
function parseFlags(argv: string[]) {
	const out: { help?: boolean; timestamps: boolean; max?: number; lang?: string[]; urlOrId?: string } = {
    timestamps: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
		if (a === '--help' || a === '-h') {
			out.help = true;
		} else if (a === '--timestamps') {
      out.timestamps = true;
    } else if (a === '--max') {
      const v = argv[i + 1];
      if (v && !v.startsWith('--')) { out.max = Number(v); i++; }
    } else if (a.startsWith('--max=')) {
      out.max = Number(a.split('=', 2)[1]);
    } else if (a === '--lang') {
      const v = argv[i + 1];
      if (v && !v.startsWith('--')) { out.lang = v.split(',').map(s => s.trim()).filter(Boolean); i++; }
    } else if (a.startsWith('--lang=')) {
      out.lang = a.split('=', 2)[1].split(',').map(s => s.trim()).filter(Boolean);
    } else if (!a.startsWith('--') && !out.urlOrId) {
      out.urlOrId = a;
    }
  }
  return out;
}

async function main(){
	const flags = parseFlags(process.argv.slice(2));
	if (flags.help){
		console.log('Usage: yt-transcript [<url|videoId>] [--lang en,fr] [--timestamps] [--max 8000]');
		console.log('Without URL/ID, the default demo video is used: ' + DEFAULT_VIDEO);
		process.exit(0);
	}
	// Determine whether the first argument is a URL/ID or an option
	let target: string | undefined = flags.urlOrId;
	if (!target) {
		target = DEFAULT_VIDEO;
		console.error('(i) No video provided, using default video.');
	}
	const langs = flags.lang;
	const includeTimestamps = flags.timestamps;
	const maxCharsPerChunk = typeof flags.max === 'number' ? flags.max : 0; // no chunking by default

	const vid = extractVideoId(target);
	if (!vid){
		console.error('Invalid video ID.');
		process.exit(1);
	}
	try {
		const transcript = await fetchTranscript(vid, langs);
		if(!transcript?.length){
			console.error('Empty transcript.');
			process.exit(2);
		}
		const lines = buildLinesFromSegments(transcript as any, includeTimestamps, decodeHtmlEntities);
		const chunks = chunkLinesByChars(lines, maxCharsPerChunk);
		const total = chunks.length;

		for (let i = 0; i < total; i++) {
			// Uncomment or Comments the following lines to show or hide chunk information
		//   if (total > 1) {
		//     console.log(`--- Chunk ${i + 1}/${total} ---`);
		//   }
		  console.log(chunks[i].join('\n'));
		}
	} catch(e){
		console.error('Error:', (e instanceof Error)? e.message: String(e));
		process.exit(3);
	}
}

main();
