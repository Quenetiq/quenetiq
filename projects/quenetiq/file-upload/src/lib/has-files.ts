export function hasFiles(value: unknown): boolean {
	if (value instanceof File || value instanceof Blob) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.some((item) => hasFiles(item));
	}

	if (value !== null && typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).some((v) => hasFiles(v));
	}

	return false;
}
