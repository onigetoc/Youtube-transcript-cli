#!/usr/bin/env node
/**
 * CLI entry point for youtube-transcript-cli.
 * Usage: youtube-transcript-cli [<url|videoId>] [--lang en,fr] [--timestamps | --srt] [--split 8000]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { extractVideoId } from './utils/video.js';
import { fetchTranscript, buildLinesFromSegments } from './transcript.js';
import { formatSrt } from './formatters/srt.js';
import { chunkLinesByChars } from './formatters/text.js';

const DEFAULT_VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

// ─── CLI Flags ───────────────────────────────────────────────────────────────

interface CliFlags {
	help?: boolean;
	version?: boolean;
	timestamps: boolean;
	srt?: boolean;
	split?: number;
	lang?: string[];
	urlOrId?: string;
	unknown?: string;
}

function parseFlags(argv: string[]): CliFlags {
	const flags: CliFlags = { timestamps: false };

	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];

		if (a === '--help' || a === '-h') {
			flags.help = true;
		} else if (a === '--version' || a === '-v') {
			flags.version = true;
		} else if (a === '--timestamps') {
			flags.timestamps = true;
		} else if (a === '--srt') {
			flags.srt = true;
		} else if (a === '--split' || a.startsWith('--split=')) {
			flags.split = parseSplitValue(a, argv[i + 1]);
			if (a === '--split' && argv[i + 1] && !argv[i + 1].startsWith('--')) i++;
		} else if (a === '--lang' || a.startsWith('--lang=')) {
			flags.lang = parseLangValue(a, argv[i + 1]);
			if (a === '--lang' && argv[i + 1] && !argv[i + 1].startsWith('--')) i++;
		} else if (!a.startsWith('--') && !flags.urlOrId) {
			flags.urlOrId = a;
		} else if (a.startsWith('--')) {
			flags.unknown = a;
			break;
		}
	}

	return flags;
}

function parseSplitValue(arg: string, next?: string): number {
	if (arg.startsWith('--split=')) return Number(arg.split('=', 2)[1]);
	if (next && !next.startsWith('--')) return Number(next);
	return 0;
}

function parseLangValue(arg: string, next?: string): string[] {
	const raw = arg.startsWith('--lang=')
		? arg.split('=', 2)[1]
		: (next && !next.startsWith('--') ? next : '');
	return raw.split(',').map(s => s.trim()).filter(Boolean);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPackageVersion(): string {
	try {
		const baseDir = (typeof __dirname !== 'undefined')
			? __dirname
			: path.dirname(fileURLToPath(import.meta.url));
		const p = path.resolve(baseDir, '..', 'package.json');
		const raw = fs.readFileSync(p, 'utf8');
		return String(JSON.parse(raw).version || '0.0.0');
	} catch {
		return '0.0.0';
	}
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
	const flags = parseFlags(process.argv.slice(2));

	if (flags.unknown) {
		console.error(`Unknown option: ${flags.unknown}`);
		console.error('Use --help to see the supported options.');
		process.exit(1);
	}

	if (flags.help) {
		console.log('Usage: youtube-transcript-cli [<url|videoId>] [--lang en,fr] [--timestamps | --srt] [--split 8000]');
		console.log('       --split groups output into chunks for downstream processing; it does not truncate the full transcript.');
		console.log('Without URL/ID, the default demo video is used: ' + DEFAULT_VIDEO);
		process.exit(0);
	}

	if (flags.version) {
		console.log(getPackageVersion());
		process.exit(0);
	}

	const target = flags.urlOrId || DEFAULT_VIDEO;
	if (!flags.urlOrId) console.error('(i) No video provided, using default video.');

	const vid = extractVideoId(target);
	if (!vid) {
		console.error('Invalid video ID.');
		process.exit(1);
	}

	try {
		const transcript = await fetchTranscript(vid, flags.lang);
		if (!transcript?.length) {
			console.error('Empty transcript.');
			process.exit(2);
		}

		const maxChars = typeof flags.split === 'number' ? flags.split : 0;

		if (flags.srt) {
			outputSrt(transcript as any, maxChars);
		} else {
			outputText(transcript as any, flags.timestamps, maxChars);
		}
	} catch (e) {
		console.error('Error:', (e instanceof Error) ? e.message : String(e));
		process.exit(3);
	}
}

function outputSrt(transcript: any[], maxChars: number) {
	const srtChunks = formatSrt(transcript, maxChars);
	for (let i = 0; i < srtChunks.length; i++) {
		if (srtChunks.length > 1) console.error(`(i) SRT chunk ${i + 1}/${srtChunks.length}`);
		console.log(srtChunks[i]);
	}
}

function outputText(transcript: any[], includeTimestamps: boolean, maxChars: number) {
	const lines = buildLinesFromSegments(transcript, includeTimestamps);
	const chunks = chunkLinesByChars(lines, maxChars);
	for (let i = 0; i < chunks.length; i++) {
		if (chunks.length > 1) console.error(`(i) Text chunk ${i + 1}/${chunks.length}`);
		console.log(chunks[i].join('\n'));
	}
}

main();
