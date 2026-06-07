/**
 * Plain-text formatting and chunking utilities.
 */

import { normalizeGlitches } from '../utils/html.js';
import { decodeHtmlEntities } from '../utils/html.js';

export function format(items: Array<{ text: string; offset?: number }>, includeTs: boolean): string {
	return items.map(seg => {
		const clean = normalizeGlitches(decodeHtmlEntities(seg.text));
		if (!includeTs) return clean;
		const seconds = (seg.offset || 0) / 1000;
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		const ts = (h > 0 ? `${h}:` : '') + `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `[${ts}] ${clean}`;
	}).join('\n');
}

export function chunk(text: string, max: number): string[] {
	if (text.length <= max) return [text];
	const out: string[] = [];
	let i = 0;
	while (i < text.length) {
		out.push(text.slice(i, i + max));
		i += max;
	}
	return out;
}

function normalizeMaxCharsPerChunk(maxCharsPerChunk: number): number {
	if (!maxCharsPerChunk || maxCharsPerChunk <= 0) return 0;
	return Math.min(20000, Math.max(500, Math.floor(maxCharsPerChunk)));
}

export function chunkLinesByChars(lines: string[], maxCharsPerChunk: number): string[][] {
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
