import { notFound } from './utils/response.js';
import { handleImages } from './routes/images.js';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		switch (url.pathname) {
			case '/images':
				return handleImages(request, env, ctx);
			default:
				return notFound();
		}
	},
};
