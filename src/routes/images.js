import { jsonResponse, errorResponse } from '../utils/response.js';

export const EXCLUDED_KEYS = ['profile_cropped.jpeg', 'manifest.json'];
export const BASE_URL = 'https://images.stixvish.com';
export const SELECTION_COUNT = 15;

export function filterKeys(objects) {
	return objects.map((obj) => obj.key).filter((key) => !EXCLUDED_KEYS.includes(key));
}

export function selectRandom(keys, count = SELECTION_COUNT) {
	const shuffled = [...keys];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function buildPhotos(keys, manifest) {
	return keys.map((key) => ({
		url: `${BASE_URL}/${key}`,
		alt: manifest[key]?.alt ?? key,
		width: manifest[key]?.width,
		height: manifest[key]?.height,
	}));
}

export async function handleImages(request, env, ctx) {
	const cache = caches.default;
	const cacheKey = new Request('https://cache/r2-image-list');

	let allKeys, manifest;
	const cached = await cache.match(cacheKey);

	if (cached) {
		const body = await cached.json();
		allKeys = body.keys;
		manifest = body.manifest;
	} else {
		const [objects, manifestObj] = await Promise.all([env.IMAGES_BUCKET.list(), env.IMAGES_BUCKET.get('manifest.json')]);

		if (!manifestObj) {
			return errorResponse('manifest not found', request, 500);
		}

		allKeys = filterKeys(objects.objects);
		manifest = await manifestObj.json();

		ctx.waitUntil(
			cache.put(
				cacheKey,
				new Response(JSON.stringify({ keys: allKeys, manifest }), {
					headers: { 'Cache-Control': 'max-age=3600' },
				}),
			),
		);
	}

	const selected = selectRandom(allKeys);
	const photos = buildPhotos(selected, manifest);

	return jsonResponse(photos, request);
}
