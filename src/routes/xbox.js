import { jsonResponse, errorResponse } from '../utils/response.js';

const EXCLUDED_TITLES = ['Minecraft Launcher'];

export async function handleXbox(request, env) {
	const headers = {
		'x-authorization': env.XBL_API_KEY,
		Accept: 'application/json',
	};

	// check presence first
	const presenceRes = await fetch('https://api.xbl.io/v2/presence', { headers });

	if (presenceRes.ok) {
		const presenceData = await presenceRes.json();
		const titles = presenceData.people?.[0]?.presenceTitleRecords;

		if (titles?.length) {
			const active = titles.find((t) => t.isTitleActive);
			if (active) {
				return jsonResponse(
					{
						title: active.titleName,
						coverUrl: active.titleSmallLogoImage ?? null,
						lastPlayed: new Date().toISOString(),
						isPlaying: true,
						platform: 'xbox',
					},
					request,
					200,
					90,
				);
			}
		}
	}

	// fall back to title history
	const titlesRes = await fetch('https://api.xbl.io/v2/titles', { headers });

	if (!titlesRes.ok) {
		return errorResponse('failed to fetch xbox data', request, 500);
	}

	const data = await titlesRes.json();
	const allTitles = data.content?.titles;

	if (!allTitles?.length) {
		return errorResponse('no games found', request, 404);
	}

	const game = allTitles
		.filter((t) => t.titleHistory?.lastTimePlayed && t.displayImage && t.type === 'Game' && !EXCLUDED_TITLES.includes(t.name))
		.sort((a, b) => new Date(b.titleHistory.lastTimePlayed) - new Date(a.titleHistory.lastTimePlayed))[0];

	if (!game) {
		return errorResponse('no valid games found', request, 404);
	}

	return jsonResponse(
		{
			title: game.name,
			coverUrl: game.displayImage,
			lastPlayed: game.titleHistory.lastTimePlayed,
			isPlaying: false,
			platform: 'xbox',
		},
		request,
		200,
		90,
	);
}
