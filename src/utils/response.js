const ALLOWED_ORIGINS = ['https://stixvish.com', 'http://localhost:4321', 'https://www.stixvish.com'];

export function getAllowedOrigin(request) {
	const origin = request.headers.get('Origin') ?? '';
	return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

export function getCorsHeaders(request) {
	return {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': getAllowedOrigin(request),
		'Access-Control-Allow-Methods': 'GET',
	};
}

export function jsonResponse(data, request, status = 200, maxAge = 0) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...getCorsHeaders(request),
			'Cache-Control': maxAge > 0 ? `s-maxage=${maxAge}, stale-while-revalidate=60` : 'no-store',
		},
	});
}

export function errorResponse(message, request, status = 500) {
	return jsonResponse({ error: message }, request, status);
}

export function notFound(request) {
	return errorResponse('Not found', request, 404);
}
