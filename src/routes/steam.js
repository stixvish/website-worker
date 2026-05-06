import { errorResponse, jsonResponse } from '../utils/response.js';

export async function handleSteam(request, env) {
	const recentRes = await fetch(
		`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${env.STEAM_API_KEY}&steamid=${env.STEAM_ID}&count=1`,
	);

	if (!recentRes.ok) {
		return errorResponse('failed to fetch steam data', request, 500);
	}

	const recentData = await recentRes.json();
	let game;

	if (recentData.response?.games?.length) {
		game = recentData.response.games[0];
	} else {
		// fall back to full library sorted by last played
		const ownedRes = await fetch(
			`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${env.STEAM_API_KEY}&steamid=${env.STEAM_ID}&include_played_free_games=1&include_appinfo=1`,
		);

		if (!ownedRes.ok) {
			return errorResponse('failed to fetch owned games', request, 500);
		}

		const ownedData = await ownedRes.json();

		if (!ownedData.response?.games?.length) {
			return errorResponse('no games found', request, 404);
		}

		game = ownedData.response.games.filter((g) => g.rtime_last_played > 0).sort((a, b) => b.rtime_last_played - a.rtime_last_played)[0];
	}

	const appId = game.appid;

	return jsonResponse(
		{
			title: game.name,
			appId,
			coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
			iconUrl: `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${game.img_icon_url}.jpg`,
			lastPlayed: game.rtime_last_played,
			playtime2Weeks: game.playtime_2weeks ?? 0,
			storeUrl: `https://store.steampowered.com/app/${appId}`,
			platform: 'steam',
		},
		request,
		200,
		90,
	);
}
