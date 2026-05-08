import { jsonResponse, errorResponse, getAllowedOrigin } from '../utils/response.js';

const CACHE_KEY = new Request('https://cache/xbox');
const CACHE_TTL = 90;
const EXCLUDED_TITLES = ['Minecraft Launcher'];

async function getPlaytimeHours(titleId, headers) {
	try {
		const res = await fetch(`https://api.xbl.io/v2/achievements/stats/${titleId}`, { headers });
		if (!res.ok) return null;
		const data = await res.json();
		const stats = data.content?.statlistscollection?.[0]?.stats ?? [];
		const minutesStat = stats.find((s) => s.name === 'MinutesPlayed');
		if (!minutesStat) return null;
		return Math.round(Number(minutesStat.value) / 60);
	} catch {
		return null;
	}
}

export async function fetchXboxData(env) {
	const headers = {
		'x-authorization': env.XBL_API_KEY,
		Accept: 'application/json',
	};

	const [presenceRes, titlesRes] = await Promise.all([
		fetch('https://api.xbl.io/v2/presence', { headers }),
		fetch('https://api.xbl.io/v2/titles', { headers }),
	]);

	if (!titlesRes.ok) throw new Error('failed to fetch xbox data');

	const titlesData = await titlesRes.json();
	const validTitles = (titlesData.content?.titles ?? [])
		.filter((t) => t.titleHistory?.lastTimePlayed && t.displayImage && t.type === 'Game' && !EXCLUDED_TITLES.includes(t.name))
		.sort((a, b) => new Date(b.titleHistory.lastTimePlayed) - new Date(a.titleHistory.lastTimePlayed));

	if (!validTitles.length) throw new Error('no valid games found');

	let isPlaying = false;
	let game = validTitles[0];

	if (presenceRes.ok) {
		const presenceData = await presenceRes.json();
		const content = presenceData.content;

		if (content?.state === 'Online') {
			const presenceTitles = content.devices?.flatMap((d) => d.titles) ?? [];
			const active = presenceTitles.find((t) => t.placement === 'Full' && t.state === 'Active');

			if (active) {
				isPlaying = true;
				game = validTitles.find((t) => String(t.titleId) === String(active.id)) ?? game;
			}
		}
	}

	const playtimeTotal = await getPlaytimeHours(game.titleId, headers);

	return {
		title: game.name,
		coverUrl: game.displayImage,
		lastPlayed: isPlaying ? new Date().toISOString() : game.titleHistory.lastTimePlayed,
		playtimeTotal,
		isPlaying,
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
