import { notFound, getAllowedOrigin } from './utils/response.js';
import { handleImages } from './routes/images.js';
import { handleSpotify } from './routes/spotify.js';
import { handleWeather } from './routes/weather.js';
import { handleSteam } from './routes/steam.js';
import { handleXbox } from './routes/xbox.js';
import { handleLetterboxd } from './routes/letterboxd.js';
import { handleGithub } from './routes/github.js';

export default {
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': getAllowedOrigin(request),
					'Access-Control-Allow-Methods': 'GET',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		const url = new URL(request.url);

		switch (url.pathname) {
			case '/images':
				return handleImages(request, env, ctx);
			case '/spotify':
				return handleSpotify(request, env);
			case '/weather':
				return handleWeather(request, env);
			case '/steam':
				return handleSteam(request, env);
			case '/xbox':
				return handleXbox(request, env);
			case '/letterboxd':
				return handleLetterboxd(request, env);
			case '/github':
				return handleGithub(request, env);
			default:
				return notFound(request);
		}
	},
};
