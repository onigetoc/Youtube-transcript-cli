/**
 * YouTube video ID extraction from various URL formats.
 */

export function extractVideoId(input: string): string | null {
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
