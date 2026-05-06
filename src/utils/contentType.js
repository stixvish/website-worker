const CONTENT_TYPES = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif',
};

export function getContentType(filename) {
	const ext = filename.split('.').pop().toLowerCase();
	return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}
