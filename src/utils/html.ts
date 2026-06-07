/**
 * HTML entity decoding and text normalization utilities.
 */

export function decodeHtmlEntities(raw: string): string {
	if (!raw || !raw.includes('&')) return raw;
	return raw
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&#(\d+);/g, (_, d) => {
			try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; }
		})
		.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
			try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; }
		});
}

export function normalizeGlitches(text: string): string {
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
		/Â·/g,
	];
	let out = text;
	for (const p of patterns) out = out.replace(p, '♪');
	out = out.replace(/♪{2,}/g, '♪');
	return out.trim();
}
