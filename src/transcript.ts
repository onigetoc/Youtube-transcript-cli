/**
 * Transcript fetching and segment processing.
 */

import { YoutubeTranscript } from 'youtube-transcript-plus';
import { formatTimestamp } from './utils/time.js';
import { decodeHtmlEntities } from './utils/html.js';

export type TranscriptSegment = {
	text: string;
	duration?: number;
	offset?: number;
	start?: number;
};

export async function fetchTranscript(videoId: string, languages?: string[]) {
	if (languages && languages.length) {
		for (const lang of languages) {
			try {
				const t = await YoutubeTranscript.fetchTranscript(videoId, { lang });
				if (t?.length) return t;
			} catch { /* try next language */ }
		}
	}
	return YoutubeTranscript.fetchTranscript(videoId);
}

export function buildLinesFromSegments(
	segments: TranscriptSegment[],
	includeTimestamps: boolean
): string[] {
	return segments.map(seg => {
		const startSec = seg.offset ?? seg.start ?? 0;
		const clean = decodeHtmlEntities(seg.text || '');
		return includeTimestamps ? `${formatTimestamp(startSec)} ${clean}` : clean;
	});
}
