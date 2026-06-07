/**
 * Timestamp formatting utilities for display and SRT output.
 */

/** Format seconds to [HH:MM:SS] or [MM:SS] for display. */
export function formatTimestamp(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds || 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return h > 0
		? `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}]`
		: `[${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}]`;
}

/** Format seconds to SRT timestamp: HH:MM:SS,mmm */
export function formatSrtTimestamp(totalSeconds: number): string {
	const safeSeconds = Math.max(0, totalSeconds || 0);
	let hours = Math.floor(safeSeconds / 3600);
	let minutes = Math.floor((safeSeconds % 3600) / 60);
	let seconds = Math.floor(safeSeconds % 60);
	let milliseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);

	if (milliseconds === 1000) {
		milliseconds = 0;
		seconds += 1;
	}
	if (seconds === 60) {
		seconds = 0;
		minutes += 1;
	}
	if (minutes === 60) {
		minutes = 0;
		hours += 1;
	}

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}
