import { jsonResponse, errorResponse, getAllowedOrigin } from '../utils/response.js';
import { fetchSteamData } from './steam.js';
import { fetchXboxData } from './xbox.js';

const CACHE_KEY = new Request('https://cache/gaming');
const CACHE_TTL = 90;

export async function handleGaming(request, env, ctx) {
	const cache = caches.default;
	const cached = await cache.match(CACHE_KEY);
	if (cached) {
		const headers = new Headers(cached.headers);
		headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
		return new Response(cached.body, { ...cached, headers });
	}

	const [steamResult, xboxResult] = await Promise.allSettled([fetchSteamData(env), fetchXboxData(env)]);

	const steam = steamResult.status === 'fulfilled' ? steamResult.value : null;
	const xbox = xboxResult.status === 'fulfilled' ? xboxResult.value : null;

	if (!steam && !xbox) {
		return errorResponse('failed to fetch gaming data', request, 500);
	}

	const steamDate = steam?.lastPlayed
		? new Date(typeof steam.lastPlayed === 'number' ? steam.lastPlayed * 1000 : steam.lastPlayed)
		: new Date(0);
	const xboxDate = xbox?.lastPlayed ? new Date(xbox.lastPlayed) : new Date(0);

	const mostRecent = !steam ? xbox : !xbox ? steam : steamDate > xboxDate ? steam : xbox;

	const res = jsonResponse(mostRecent, request, 200, CACHE_TTL);
	ctx.waitUntil(cache.put(CACHE_KEY, res.clone()));
	return res;
}
