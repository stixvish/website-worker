import { jsonResponse, errorResponse } from '../utils/response.js';

export const EXCLUDED_KEYS = ['profile_cropped.jpeg', 'manifest.json'];
export const BASE_URL = 'https://images.stixvish.com';
export const SELECTION_COUNT = 15;

export function filterKeys(objects) {
	return objects.map((obj) => obj.key).filter((key) => !EXCLUDED_KEYS.includes(key));
}

export function selectRandom(keys, count = SELECTION_COUNT) {
	const shuffled = [...keys].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, Math.min(count, keys.length));
}

export function buildPhotos(keys, manifest) {
	return keys.map((key) => ({
		url: `${BASE_URL}/${key}`,
		alt: manifest[key] ?? key,
	}));
}

export async function handleImages(request, env, ctx) {
	const cache = caches.default;
	const cacheKey = new Request('https://cache/r2-image-list');

	let allKeys;
	const cached = await cache.match(cacheKey);

	if (cached) {
		allKeys = await cached.json();
	} else {
		const objects = await env.IMAGES_BUCKET.list();
		allKeys = filterKeys(objects.objects);

		ctx.waitUntil(
			cache.put(
				cacheKey,
				new Response(JSON.stringify(allKeys), {
					headers: { 'Cache-Control': 'max-age=3600' },
				}),
			),
		);
	}

	const manifestObj = await env.IMAGES_BUCKET.get('manifest.json');
	if (!manifestObj) {
		return errorResponse('manifest not found', 500);
	}
	const manifest = await manifestObj.json();

	const selected = selectRandom(allKeys);
	const photos = buildPhotos(selected, manifest);

	return jsonResponse(photos);
}
