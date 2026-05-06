import { jsonResponse, errorResponse } from '../utils/response.js';

const LETTERBOXD_USERNAME = 'stixvish';

export async function handleLetterboxd(request, env) {
	const res = await fetch(`https://letterboxd.com/${LETTERBOXD_USERNAME}/rss/`);

	if (!res.ok) {
		return errorResponse('failed to fetch letterboxd feed', request, 500);
	}

	const xml = await res.text();

	const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
	if (!item) {
		return errorResponse('no films found', request, 404);
	}

	const title = item.match(/<letterboxd:filmTitle>(.*?)<\/letterboxd:filmTitle>/)?.[1] ?? null;
	const year = item.match(/<letterboxd:filmYear>(.*?)<\/letterboxd:filmYear>/)?.[1] ?? null;
	const rating = item.match(/<letterboxd:memberRating>(.*?)<\/letterboxd:memberRating>/)?.[1] ?? null;
	const watchedDate = item.match(/<letterboxd:watchedDate>(.*?)<\/letterboxd:watchedDate>/)?.[1] ?? null;
	const url = item.match(/<link>(.*?)<\/link>/)?.[1] ?? null;
	const posterUrl = item.match(/<img src="(.*?)"/)?.[1] ?? null;

	return jsonResponse(
		{
			title,
			year,
			rating: rating ? parseFloat(rating) : null,
			watchedDate,
			url,
			posterUrl,
		},
		request,
		200,
		3600,
	);
}
