import { jsonResponse, errorResponse } from '../utils/response.js';
import { handleSteam } from './steam.js';
import { handleXbox } from './xbox.js';

export async function handleGaming(request, env, ctx) {
	const [steamRes, xboxRes] = await Promise.all([handleSteam(request, env, ctx), handleXbox(request, env, ctx)]);

	const steam = steamRes.ok ? await steamRes.json() : null;
	const xbox = xboxRes.ok ? await xboxRes.json() : null;

	if (!steam && !xbox) {
		return errorResponse('failed to fetch gaming data', request, 500);
	}

	if (!steam) return jsonResponse({ ...xbox }, request, 200, 90);
	if (!xbox) return jsonResponse({ ...steam }, request, 200, 90);

	// both succeeded — return most recently played
	const steamDate = steam.lastPlayed
		? new Date(typeof steam.lastPlayed === 'number' ? steam.lastPlayed * 1000 : steam.lastPlayed)
		: new Date(0);
	const xboxDate = xbox.lastPlayed ? new Date(xbox.lastPlayed) : new Date(0);

	const mostRecent = steamDate > xboxDate ? steam : xbox;

	return jsonResponse(mostRecent, request, 200, 90);
}
