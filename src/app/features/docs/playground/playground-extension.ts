/**
 * Playground extension for the custom markdown parser.
 *
 * Usage in markdown:
 * ```
 * :::playground
 * ```ts
 * const x = 1;
 * ```
 * :::
 * ```
 *
 * Parsing is handled by parseMarkdown() in markdown-parser.ts.
 * This module only provides the HTML escaping utility.
 */

export function escapePlaygroundCode(code: string): string {
	return code
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
