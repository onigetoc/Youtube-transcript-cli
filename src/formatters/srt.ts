/**
 * SRT subtitle formatting: parsing, entries, chunking.
 */

import { normalizeGlitches } from '../utils/html.js';
import { formatSrtTimestamp } from '../utils/time.js';
import { buildLinesFromSegments, type TranscriptSegment } from '../transcript.js';
import { decodeHtmlEntities } from '../utils/html.js';

export type SubtitleEntry = {
	startSec: number;
	endSec: number;
	text: string;
};

type ParsedTimestampLine = {
	startSec: number;
	text: string;
};

export function parseTimestampLine(line: string): ParsedTimestampLine | null {
	const m = line.match(/^\[(?:(\d{2}):)?(\d{2}):(\d{2})\]\s*(.+)$/);
	if (!m) return null;
	const h = m[1] ? Number(m[1]) : 0;
	const mm = Number(m[2]);
	const ss = Number(m[3]);
	const text = normalizeGlitches(m[4] || '');
	if (!text) return null;
	return { startSec: (h * 3600) + (mm * 60) + ss, text };
}

export function toSubtitleEntriesFromTimestampLines(lines: string[]): SubtitleEntry[] {
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

export function formatSrt(items: TranscriptSegment[], maxCharsPerChunk: number): string[] {
	const timestampLines = buildLinesFromSegments(items, true);
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
