import { jsonResponse, errorResponse, getAllowedOrigin } from '../utils/response.js';

const CACHE_KEY = new Request('https://cache/letterboxd');
const CACHE_TTL = 3600;

function extractReview(description) {
	if (!description) return null;

	const withoutImage = description.replace(/<p><img[^>]+><\/p>/i, '');
	const withoutSpoiler = withoutImage.replace(/<p><em>This review may contain spoilers\.<\/em><\/p>/i, '');
	const text = withoutSpoiler.replace(/<[^>]+>/g, '').trim();

	if (!text) return null;
	if (text.length <= 180) return text;

	const truncated = text.slice(0, 180);
	return truncated.slice(0, truncated.lastIndexOf(' ')) + '...';
}

export async function handleLetterboxd(request, env, ctx) {
	const cache = caches.default;
	const cached = await cache.match(CACHE_KEY);

	if (cached) {
		const headers = new Headers(cached.headers);
		headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
		return new Response(cached.body, { ...cached, headers });
	}

	try {
		const res = await fetch('https://letterboxd.com/stixvish/rss/');
		if (!res.ok) throw new Error('failed to fetch letterboxd feed');

		const xml = await res.text();
		const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
		if (!item) throw new Error('no films found');

		const title = item.match(/<letterboxd:filmTitle>(.*?)<\/letterboxd:filmTitle>/)?.[1] ?? null;
		const year = item.match(/<letterboxd:filmYear>(.*?)<\/letterboxd:filmYear>/)?.[1] ?? null;
		const rating = item.match(/<letterboxd:memberRating>(.*?)<\/letterboxd:memberRating>/)?.[1] ?? null;
		const watchedDate = item.match(/<letterboxd:watchedDate>(.*?)<\/letterboxd:watchedDate>/)?.[1] ?? null;
		const url = item.match(/<link>(.*?)<\/link>/)?.[1] ?? null;
		const rewatch = item.match(/<letterboxd:rewatch>(.*?)<\/letterboxd:rewatch>/)?.[1] === 'Yes';

		const descriptionMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
		const descriptionHtml = descriptionMatch?.[1] ?? null;
		const posterUrl = descriptionHtml?.match(/<img src="(.*?)"/)?.[1] ?? null;
		const review = extractReview(descriptionHtml);

		const data = {
			title,
			year,
			rating: rating ? parseFloat(rating) : null,
			watchedDate,
			url,
			posterUrl,
			review,
			rewatch,
		};

		const response = jsonResponse(data, request, 200, CACHE_TTL);
		ctx.waitUntil(cache.put(CACHE_KEY, response.clone()));
		return response;
	} catch (err) {
		return errorResponse(err.message, request, 500);
	}
}
