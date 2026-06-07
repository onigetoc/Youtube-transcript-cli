#!/usr/bin/env node
// Quick CLI to fetch a transcript without going through MCP.
// Usage: node build/cli.js [<url|videoId>] [--lang en,fr] [--timestamps] [--split 8000]
// If no first argument is provided (or it starts with --), use the default video.
// Default test video: https://www.youtube.com/watch?v=dQw4w9WgXcQ

const DEFAULT_VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

import { YoutubeTranscript } from 'youtube-transcript-plus';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

type SubtitleEntry = {
	startSec: number;
	endSec: number;
	text: string;
};

type ParsedTimestampLine = {
	startSec: number;
	text: string;
};

function formatSrtTimestamp(totalSeconds: number): string {
	const safeSeconds = Math.max(0, totalSeconds || 0);
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const seconds = Math.floor(safeSeconds % 60);
	let milliseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);
	let adjustedHours = hours;
	let adjustedMinutes = minutes;
	let adjustedSeconds = seconds;
	if (milliseconds === 1000) {
		milliseconds = 0;
		adjustedSeconds += 1;
	}
	if (adjustedSeconds === 60) {
		adjustedSeconds = 0;
		adjustedMinutes += 1;
	}
	if (adjustedMinutes === 60) {
		adjustedMinutes = 0;
		adjustedHours += 1;
	}
	return `${String(adjustedHours).padStart(2, '0')}:${String(adjustedMinutes).padStart(2, '0')}:${String(adjustedSeconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

function parseTimestampLine(line: string): ParsedTimestampLine | null {
	const m = line.match(/^\[(?:(\d{2}):)?(\d{2}):(\d{2})\]\s*(.+)$/);
	if (!m) return null;
	const h = m[1] ? Number(m[1]) : 0;
	const mm = Number(m[2]);
	const ss = Number(m[3]);
	const text = normalizeGlitches(m[4] || '');
	if (!text) return null;
	return {
		startSec: (h * 3600) + (mm * 60) + ss,
		text,
	};
}

function toSubtitleEntriesFromTimestampLines(lines: string[]): SubtitleEntry[] {
	const parsed = lines
		.map(parseTimestampLine)
		.filter((entry): entry is ParsedTimestampLine => Boolean(entry));

	if (!parsed.length) return [];

	const merged: ParsedTimestampLine[] = [];
	for (const entry of parsed) {
		const last = merged[merged.length - 1];
		if (last && last.startSec === entry.startSec) {
			last.text = `${last.text} ${entry.text}`.trim();
		} else {
			merged.push({ ...entry });
		}
	}

	merged.sort((a, b) => a.startSec - b.startSec);

	return merged.map((entry, index) => {
		const next = merged[index + 1];
		const startSec = entry.startSec;
		let endSec = next ? next.startSec - 0.05 : startSec + 2;
		if (endSec <= startSec) endSec = startSec + 1;
		return { startSec, endSec, text: entry.text };
	});
}

function formatSrtFromEntries(entries: SubtitleEntry[], startIndex = 1): { srt: string; nextIndex: number } {
	if (!entries.length) return { srt: '', nextIndex: startIndex };
	const result: string[] = [];
	for (let i = 0; i < entries.length; i++) {
		const current = entries[i];
		result.push(
			String(startIndex + i),
			`${formatSrtTimestamp(current.startSec)} --> ${formatSrtTimestamp(current.endSec)}`,
			current.text,
			''
		);
	}
	return {
		srt: result.join('\n').trimEnd(),
		nextIndex: startIndex + entries.length,
	};
}

function normalizeMaxCharsPerChunk(maxCharsPerChunk: number): number {
	if (!maxCharsPerChunk || maxCharsPerChunk <= 0) return 0;
	return Math.min(20000, Math.max(500, Math.floor(maxCharsPerChunk)));
}

function getSubtitleEntriesTextLength(entries: SubtitleEntry[]): number {
	return entries.reduce((total, entry) => total + entry.text.length, 0);
}

function formatSrt(items: Array<{ text: string; duration?: number; offset?: number; start?: number }>, decodeHtml: (s: string) => string, maxCharsPerChunk: number): string[] {
	const timestampLines = buildLinesFromSegments(items, true, decodeHtml);
	const entries = toSubtitleEntriesFromTimestampLines(timestampLines);
	if (!entries.length) return [];

	const max = normalizeMaxCharsPerChunk(maxCharsPerChunk);
	if (!max) {
		return [formatSrtFromEntries(entries, 1).srt];
	}

	const srtChunks: string[] = [];
	let buffer: SubtitleEntry[] = [];
	let bufferTextLength = 0;

	for (const entry of entries) {
		const candidateTextLength = bufferTextLength + entry.text.length;

		if (buffer.length && candidateTextLength > max) {
			const rendered = formatSrtFromEntries(buffer, 1);
			if (rendered.srt) srtChunks.push(rendered.srt);
			buffer = [entry];
			bufferTextLength = entry.text.length;
			continue;
		}

		buffer.push(entry);
		bufferTextLength = candidateTextLength;
	}

	if (buffer.length) {
		const rendered = formatSrtFromEntries(buffer, 1);
		if (rendered.srt) srtChunks.push(rendered.srt);
	}

	return srtChunks;
}

function chunkLinesByChars(lines: string[], maxCharsPerChunk: number): string[][] {
  if (!maxCharsPerChunk || maxCharsPerChunk <= 0) return [lines];
  const max = normalizeMaxCharsPerChunk(maxCharsPerChunk);
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

// Small CLI flags parser: --timestamps, --srt, --split, --lang
function parseFlags(argv: string[]) {
	const out: { help?: boolean; timestamps: boolean; srt?: boolean; split?: number; lang?: string[]; urlOrId?: string; version?: boolean; unknown?: string } = {
    timestamps: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
		if (a === '--help' || a === '-h') {
			out.help = true;
		} else if (a === '--timestamps') {
      out.timestamps = true;
		} else if (a === '--srt') {
			out.srt = true;
		} else if (a === '--version' || a === '-v') {
			out.version = true;
		} else if (a === '--split') {
      const v = argv[i + 1];
			if (v && !v.startsWith('--')) { out.split = Number(v); i++; }
		} else if (a.startsWith('--split=')) {
			out.split = Number(a.split('=', 2)[1]);
    } else if (a === '--lang') {
      const v = argv[i + 1];
      if (v && !v.startsWith('--')) { out.lang = v.split(',').map(s => s.trim()).filter(Boolean); i++; }
    } else if (a.startsWith('--lang=')) {
      out.lang = a.split('=', 2)[1].split(',').map(s => s.trim()).filter(Boolean);
    } else if (!a.startsWith('--') && !out.urlOrId) {
      out.urlOrId = a;
		} else if (a.startsWith('--')) {
			out.unknown = a;
			break;
    }
  }
  return out;
}

function getPackageVersion(): string {
	try {
		const baseDir = (typeof __dirname !== 'undefined') ? __dirname : path.dirname(fileURLToPath(import.meta.url));
		const p = path.resolve(baseDir, '..', 'package.json');
		const raw = fs.readFileSync(p, 'utf8');
		const j = JSON.parse(raw);
		return String(j.version || '0.0.0');
	} catch {
		return '0.0.0';
	}
}

async function main(){
	const flags = parseFlags(process.argv.slice(2));
	if (flags.unknown) {
		console.error(`Unknown option: ${flags.unknown}`);
		console.error('Use --help to see the supported options.');
		process.exit(1);
	}
	if (flags.help){
		console.log('Usage: youtube-transcript-cli [<url|videoId>] [--lang en,fr] [--timestamps | --srt] [--split 8000]');
		console.log('       --split groups output into chunks for downstream processing; it does not truncate the full transcript.');
		console.log('Without URL/ID, the default demo video is used: ' + DEFAULT_VIDEO);
		process.exit(0);
	}
	if (flags.version){
		console.log(getPackageVersion());
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
	const includeSrt = Boolean(flags.srt);
	const maxCharsPerChunk = typeof flags.split === 'number' ? flags.split : 0; // no chunking by default

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
		if (includeSrt) {
			const srtChunks = formatSrt(transcript as any, decodeHtmlEntities, maxCharsPerChunk);
			for (let i = 0; i < srtChunks.length; i++) {
				if (srtChunks.length > 1) {
					console.error(`(i) SRT chunk ${i + 1}/${srtChunks.length}`);
				}
				const chunk = srtChunks[i];
				console.log(chunk);
			}
			return;
		}
		const lines = buildLinesFromSegments(transcript as any, includeTimestamps, decodeHtmlEntities);
		const chunks = chunkLinesByChars(lines, maxCharsPerChunk);
		const total = chunks.length;

		for (let i = 0; i < total; i++) {
		  if (total > 1) {
			console.error(`(i) Text chunk ${i + 1}/${total}`);
		  }
		  console.log(chunks[i].join('\n'));
		}
	} catch(e){
		console.error('Error:', (e instanceof Error)? e.message: String(e));
		process.exit(3);
	}
}

main();
