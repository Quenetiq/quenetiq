export interface MdHeading {
	type: 'heading';
	level: 1 | 2 | 3 | 4;
	id: string;
	children: MdInline[];
}

export interface MdParagraph {
	type: 'paragraph';
	children: MdInline[];
}

export interface MdCode {
	type: 'code';
	language: string;
	code: string;
}

export interface MdList {
	type: 'list';
	ordered: boolean;
	items: MdListItem[];
}

export interface MdListItem {
	children: MdInline[];
}

export interface MdTable {
	type: 'table';
	headers: MdInline[][];
	rows: MdInline[][][];
}

export interface MdBlockquote {
	type: 'blockquote';
	children: MdBlock[];
}

export interface MdHr {
	type: 'hr';
}

export interface MdPlayground {
	type: 'playground';
	code: string;
}

export interface MdStackblitz {
	type: 'stackblitz';
	starter: string;
}

export type MdBlock =
	| MdHeading | MdParagraph | MdCode | MdList | MdTable | MdBlockquote | MdHr | MdPlayground | MdStackblitz;

export type MdInline =
	| { type: 'text'; value: string }
	| { type: 'bold'; children: MdInline[] }
	| { type: 'italic'; children: MdInline[] }
	| { type: 'code'; value: string }
	| { type: 'link'; href: string; children: MdInline[] }
	| { type: 'image'; src: string; alt: string };

export function parseMarkdown(body: string): MdBlock[] {
	const lines = body.split('\n');
	const blocks: MdBlock[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (line.startsWith('```')) {
			const lang = line.slice(3).trim();
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith('```')) {
				codeLines.push(lines[i]);
				i++;
			}
			blocks.push({ type: 'code', language: lang, code: codeLines.join('\n') });
			i++;
			continue;
		}

		if (line.trim() === ':::playground') {
			i++;
			const codeLines: string[] = [];
			while (i < lines.length && lines[i].trim() !== ':::') {
				codeLines.push(lines[i]);
				i++;
			}
			blocks.push({ type: 'playground', code: codeLines.join('\n') });
			i++;
			continue;
		}

		const stackblitzMatch = line.trim().match(/^:::stackblitz\s+starter="([^"]+)"$/);
		if (stackblitzMatch) {
			blocks.push({ type: 'stackblitz', starter: stackblitzMatch[1] });
			i++;
			continue;
		}

		if (/^#{1,4}\s/.test(line)) {
			const m = line.match(/^(#{1,4})\s+(.+)$/);
			if (m) {
				const level = m[1].length as 1 | 2 | 3 | 4;
				const title = m[2];
				const id = slugify(title);
				blocks.push({ type: 'heading', level, id, children: parseInline(title) });
				i++;
				continue;
			}
		}

		if (line.startsWith('> ') || line === '>') {
			const quoteLines: string[] = [];
			while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
				quoteLines.push(lines[i].startsWith('> ') ? lines[i].slice(2) : '');
				i++;
			}
			const inner = parseMarkdown(quoteLines.join('\n'));
			blocks.push({ type: 'blockquote', children: inner });
			continue;
		}

		if (/^\d+\.\s/.test(line)) {
			const items: MdListItem[] = [];
			while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
				const itemText = lines[i].replace(/^\d+\.\s+/, '');
				items.push({ children: parseInline(itemText) });
				i++;
			}
			blocks.push({ type: 'list', ordered: true, items });
			continue;
		}

		if (/^[-*]\s/.test(line)) {
			const items: MdListItem[] = [];
			while (i < lines.length && /^[-*]\s/.test(lines[i])) {
				const itemText = lines[i].replace(/^[-*]\s+/, '');
				items.push({ children: parseInline(itemText) });
				i++;
			}
			blocks.push({ type: 'list', ordered: false, items });
			continue;
		}

		if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s-:|]+\|/.test(lines[i + 1])) {
			const headers = line
				.split('|')
				.slice(1, -1)
				.map((c) => parseInline(c.trim()));
			i += 2;
			const rows: MdInline[][][] = [];
			while (i < lines.length && lines[i].startsWith('|')) {
				rows.push(
					lines[i]
						.split('|')
						.slice(1, -1)
						.map((c) => parseInline(c.trim())),
				);
				i++;
			}
			blocks.push({ type: 'table', headers, rows });
			continue;
		}

		if (/^---+$/.test(line.trim())) {
			blocks.push({ type: 'hr' });
			i++;
			continue;
		}

		if (line.trim() === '') {
			i++;
			continue;
		}

		const paraLines: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!lines[i].startsWith('#') &&
			!lines[i].startsWith('```') &&
			!lines[i].startsWith('> ') &&
			lines[i] !== '>' &&
			!lines[i].startsWith('|') &&
			!lines[i].startsWith(':::') &&
			!/^\d+\.\s/.test(lines[i]) &&
			!/^[-*]\s/.test(lines[i]) &&
			!/^---+$/.test(lines[i].trim())
		) {
			paraLines.push(lines[i]);
			i++;
		}
		if (paraLines.length) {
			blocks.push({ type: 'paragraph', children: parseInline(paraLines.join(' ')) });
		}
	}

	return blocks;
}

function findClosingBracket(text: string, openPos: number): number {
	let depth = 1;
	for (let i = openPos + 1; i < text.length; i++) {
		if (text[i] === '[') depth++;
		else if (text[i] === ']') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function parseInline(text: string): MdInline[] {
	const result: MdInline[] = [];
	let i = 0;

	while (i < text.length) {
		// Bold: **text**
		if (text[i] === '*' && text[i + 1] === '*') {
			const end = text.indexOf('**', i + 2);
			if (end !== -1) {
				result.push({ type: 'bold', children: parseInline(text.slice(i + 2, end)) });
				i = end + 2;
				continue;
			}
		}

		// Italic: *text* (single * not followed by *)
		if (text[i] === '*' && text[i + 1] !== '*' && text[i + 1] !== undefined) {
			const end = text.indexOf('*', i + 1);
			if (end !== -1 && text[end - 1] !== ' ') {
				result.push({ type: 'italic', children: parseInline(text.slice(i + 1, end)) });
				i = end + 1;
				continue;
			}
		}

		// Inline code: `text`
		if (text[i] === '`') {
			const end = text.indexOf('`', i + 1);
			if (end !== -1) {
				result.push({ type: 'code', value: text.slice(i + 1, end) });
				i = end + 1;
				continue;
			}
		}

		// Image: ![alt](url)
		if (text[i] === '!' && text[i + 1] === '[') {
			const altEnd = findClosingBracket(text, i + 1);
			if (altEnd !== -1 && altEnd + 1 < text.length && text[altEnd + 1] === '(') {
				const urlEnd = text.indexOf(')', altEnd + 2);
				if (urlEnd !== -1) {
					result.push({ type: 'image', alt: text.slice(i + 2, altEnd), src: text.slice(altEnd + 2, urlEnd) });
					i = urlEnd + 1;
					continue;
				}
			}
		}

		// Link: [text](url) — with bracket counting for nesting
		if (text[i] === '[') {
			const closeBracket = findClosingBracket(text, i);
			if (closeBracket !== -1 && closeBracket + 1 < text.length && text[closeBracket + 1] === '(') {
				const urlEnd = text.indexOf(')', closeBracket + 2);
				if (urlEnd !== -1) {
					const inner = text.slice(i + 1, closeBracket);
					const href = text.slice(closeBracket + 2, urlEnd);
					const children = parseInline(inner);
					result.push({ type: 'link', href, children });
					i = urlEnd + 1;
					continue;
				}
			}
			// No matching ]( — treat [ as text
		}

		// Plain text — consume until next special char
		let end = i + 1;
		while (end < text.length) {
			const c = text[end];
			if (c === '*' || c === '`' || c === '[' || c === '!') break;
			end++;
		}
		result.push({ type: 'text', value: text.slice(i, end) });
		i = end;
	}

	if (result.length === 0) {
		result.push({ type: 'text', value: text });
	}

	return result;
}

export function renderInline(items: MdInline[]): string {
	let html = '';
	for (const item of items) {
		switch (item.type) {
		case 'text':
			html += escapeHtml(item.value);
			break;
		case 'bold':
			html += `<strong>${renderInline(item.children)}</strong>`;
			break;
		case 'italic':
			html += `<em>${renderInline(item.children)}</em>`;
			break;
		case 'code':
			html += `<code class="md-inline-code">${escapeHtml(item.value)}</code>`;
			break;
		case 'link':
			html += `<a class="md-a" href="${escapeAttr(item.href)}">${renderInline(item.children)}</a>`;
			break;
		case 'image':
			html += `<img class="md-img" src="${escapeAttr(item.src)}" alt="${escapeAttr(item.alt)}" loading="lazy" />`;
			break;
		}
	}
	return html;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
	return text.replace(/"/g, '&quot;');
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.trim();
}
