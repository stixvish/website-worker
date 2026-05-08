import { jsonResponse, errorResponse, getAllowedOrigin } from '../utils/response.js';

const CACHE_KEY = new Request('https://cache/steam');
const CACHE_TTL = 90;

export async function fetchSteamData(env) {
	const recentRes = await fetch(
		`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${env.STEAM_API_KEY}&steamid=${env.STEAM_ID}&count=1`,
	);

	if (!recentRes.ok) throw new Error('failed to fetch steam data');

	const recentData = await recentRes.json();
	let game;

	if (recentData.response?.games?.length) {
		game = recentData.response.games[0];
	} else {
		const ownedRes = await fetch(
			`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${env.STEAM_API_KEY}&steamid=${env.STEAM_ID}&include_played_free_games=1&include_appinfo=1`,
		);

		if (!ownedRes.ok) throw new Error('failed to fetch owned games');

		const ownedData = await ownedRes.json();
		if (!ownedData.response?.games?.length) throw new Error('no games found');

		game = ownedData.response.games.filter((g) => g.rtime_last_played > 0).sort((a, b) => b.rtime_last_played - a.rtime_last_played)[0];
	}

	const appId = game.appid;

	return {
		title: game.name,
		appId,
		coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
		iconUrl: `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${game.img_icon_url}.jpg`,
		lastPlayed: game.rtime_last_played,
		playtime2Weeks: game.playtime_2weeks ?? 0,
		storeUrl: `https://store.steampowered.com/app/${appId}`,
		platform: 'steam',
	};
}

export async function handleSteam(request, env, ctx) {
	const cache = caches.default;
	const cached = await cache.match(CACHE_KEY);
	if (cached) {
		const headers = new Headers(cached.headers);
		headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
		return new Response(cached.body, { ...cached, headers });
	}

	try {
		const data = await fetchSteamData(env);
		const res = jsonResponse(data, request, 200, CACHE_TTL);
		ctx.waitUntil(cache.put(CACHE_KEY, res.clone()));
		return res;
	} catch (err) {
		return errorResponse(err.message, request, 500);
	}
}
