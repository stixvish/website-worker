import { jsonResponse, errorResponse, getAllowedOrigin } from '../utils/response.js';

const CACHE_KEY = new Request('https://cache/xbox');
const CACHE_TTL = 90;
const EXCLUDED_TITLES = ['Minecraft Launcher'];

export async function fetchXboxData(env) {
	const headers = {
		'x-authorization': env.XBL_API_KEY,
		Accept: 'application/json',
	};

	const presenceRes = await fetch('https://api.xbl.io/v2/presence', { headers });

	if (presenceRes.ok) {
		const presenceData = await presenceRes.json();
		const titles = presenceData.people?.[0]?.presenceTitleRecords;

		if (titles?.length) {
			const active = titles.find((t) => t.isTitleActive);
			if (active) {
				return {
					title: active.titleName,
					coverUrl: active.titleSmallLogoImage ?? null,
					lastPlayed: new Date().toISOString(),
					isPlaying: true,
					platform: 'xbox',
				};
			}
		}
	}

	const titlesRes = await fetch('https://api.xbl.io/v2/titles', { headers });
	if (!titlesRes.ok) throw new Error('failed to fetch xbox data');

	const data = await titlesRes.json();
	const allTitles = data.content?.titles;

	if (!allTitles?.length) throw new Error('no games found');

	const game = allTitles
		.filter((t) => t.titleHistory?.lastTimePlayed && t.displayImage && t.type === 'Game' && !EXCLUDED_TITLES.includes(t.name))
		.sort((a, b) => new Date(b.titleHistory.lastTimePlayed) - new Date(a.titleHistory.lastTimePlayed))[0];

	if (!game) throw new Error('no valid games found');

	return {
		title: game.name,
		coverUrl: game.displayImage,
		lastPlayed: game.titleHistory.lastTimePlayed,
		isPlaying: false,
		platform: 'xbox',
	};
}

export async function handleXbox(request, env, ctx) {
	const cache = caches.default;
	const cached = await cache.match(CACHE_KEY);
	if (cached) {
		const headers = new Headers(cached.headers);
		headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
		return new Response(cached.body, { ...cached, headers });
	}

	try {
		const data = await fetchXboxData(env);
		const res = jsonResponse(data, request, 200, CACHE_TTL);
		ctx.waitUntil(cache.put(CACHE_KEY, res.clone()));
		return res;
	} catch (err) {
		return errorResponse(err.message, request, 500);
	}
}
