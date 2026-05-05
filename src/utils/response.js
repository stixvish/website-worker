const CORS_HEADERS = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': 'https://stixvish.com',
};

export function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: CORS_HEADERS,
	});
}

export function errorResponse(message, status = 500) {
	return jsonResponse({ error: message }, status);
}

export function notFound() {
	return errorResponse('Not Found', 404);
}
