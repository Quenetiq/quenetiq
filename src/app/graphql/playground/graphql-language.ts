import { StreamLanguage, type StreamParser } from '@codemirror/language';

const KEYWORDS = new Set([
	'query',
	'mutation',
	'subscription',
	'fragment',
	'on',
	'type',
	'input',
	'enum',
	'interface',
	'union',
	'scalar',
	'schema',
	'extend',
	'directive',
	'repeatable',
	'implements',
	'implements @',
]);

const CONSTANTS = new Set(['true', 'false', 'null', 'undefined']);
const BUILTIN_TYPES = new Set(['Int', 'Float', 'String', 'Boolean', 'ID']);

interface GqlState {
	inBlockString: boolean;
}

const graphqlStreamParser: StreamParser<GqlState> = {
	name: 'graphql',

	startState(): GqlState {
		return { inBlockString: false };
	},

	token(stream, state): string | null {
		// Block string (triple-quoted)
		if (state.inBlockString) {
			if (stream.match('"""')) {
				state.inBlockString = false;
				return 'string';
			}
			stream.next();
			return 'string';
		}

		// Skip whitespace
		if (stream.eatSpace()) return null;

		// Comment
		if (stream.match('#')) {
			stream.skipToEnd();
			return 'comment';
		}

		// Block string start
		if (stream.match('"""')) {
			state.inBlockString = true;
			return 'string';
		}

		// String
		if (stream.match('"')) {
			while (!stream.eol()) {
				const ch = stream.next();
				if (ch === '\\') {
					stream.next(); // skip escaped char
				} else if (ch === '"') {
					break;
				}
			}
			return 'string';
		}

		// Variable
		if (stream.match(/^\$[a-zA-Z_]\w*/)) {
			return 'variableName';
		}

		// Directive
		if (stream.match(/^@[a-zA-Z_]\w*/)) {
			return 'annotation';
		}

		// Number (integer or float)
		if (stream.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/)) {
			return 'number';
		}

		// Enum value (all-caps identifier after colon, but we just match the identifier)
		if (stream.match(/^[A-Z][A-Z_0-9]*(?=\s*[,\s\)\]\}:@]|$)/)) {
			return 'constant';
		}

		// Type name (PascalCase)
		if (stream.match(/^[A-Z][a-zA-Z_]*/)) {
			const word = stream.current();
			if (BUILTIN_TYPES.has(word)) return 'typeName';
			return 'typeName';
		}

		// Keyword or identifier
		if (stream.match(/^[a-z_]\w*/)) {
			const word = stream.current();
			if (KEYWORDS.has(word)) return 'keyword';
			if (CONSTANTS.has(word)) return 'atom';
			return 'propertyName';
		}

		// Ellipsis
		if (stream.match('...')) {
			return 'operator';
		}

		// Operators and punctuation
		if (stream.match(/^[=!<>|&:,\[\]\(\)\{\}]/)) {
			return 'punctuation';
		}

		// Fallback
		stream.next();
		return null;
	},
};

export const graphqlLanguage = StreamLanguage.define(graphqlStreamParser);
