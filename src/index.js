import { notFound, getAllowedOrigin } from './utils/response.js';
import { handleImages } from './routes/images.js';

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
			default:
				return notFound(request);
		}
	},
};
