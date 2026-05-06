import { jsonResponse, errorResponse } from '../utils/response.js';

const CHICAGO_LAT = 41.8781;
const CHICAGO_LON = -87.6298;

const WMO_CODES = {
	0: 'Clear skies',
	1: 'Mostly clear',
	2: 'Partly cloudy',
	3: 'Overcast',
	45: 'Foggy',
	48: 'Icy fog',
	51: 'Light drizzle',
	53: 'Drizzle',
	55: 'Heavy drizzle',
	61: 'Light rain',
	63: 'Rain',
	65: 'Heavy rain',
	71: 'Light snow',
	73: 'Snow',
	75: 'Heavy snow',
	77: 'Snow grains',
	80: 'Light showers',
	81: 'Showers',
	82: 'Heavy showers',
	85: 'Snow showers',
	86: 'Heavy snow showers',
	95: 'Thunderstorm',
	96: 'Thunderstorm with hail',
	99: 'Thunderstorm with heavy hail',
};

export async function handleWeather(request, env) {
	const res = await fetch(
		`https://api.open-meteo.com/v1/forecast?latitude=${CHICAGO_LAT}&longitude=${CHICAGO_LON}&current=temperature_2m,apparent_temperature,weathercode&temperature_unit=fahrenheit&timezone=America%2FChicago`,
	);

	if (!res.ok) {
		return errorResponse('failed to fetch weather', request, 500);
	}

	const data = await res.json();
	const current = data.current;

	return jsonResponse(
		{
			temperature: Math.round(current.temperature_2m),
			feelsLike: Math.round(current.apparent_temperature),
			condition: WMO_CODES[current.weathercode] ?? 'Unknown',
			weatherCode: current.weathercode,
			time: current.time,
		},
		request,
		200,
		300,
	);
}
