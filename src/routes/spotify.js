import { jsonResponse, errorResponse } from '../utils/response.js';

const CACHE_KEY = new Request('https://cache/spotify');
const CACHE_TTL = 30;

const KNOWN_PLAYLISTS = {
	'37i9dQZF1FbFLUWEjHnucn': {
		name: 'Daylist',
		coverUrl: 'https://daylist.spotifycdn.com/playlist-covers-mix/en/afternoon_default.jpg',
	},
	'37i9dQZEVXcTSfAWcLwg77': {
		name: 'Discover Weekly',
		coverUrl: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/dw/cover/en',
	},
	'37i9dQZEVXbdOgSQQ4vq0e': {
		name: 'Release Radar',
		coverUrl: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/release-radar-v1/37i9dQZEVXbdOgSQQ4vq0e/en',
	},
};

const CONTEXT_FALLBACKS = {
	collection: {
		name: 'Liked Songs',
		url: 'https://open.spotify.com/collection/tracks',
		coverUrl: 'https://misc.scdn.co/liked-songs/liked-songs-64.png',
	},
};

async function getAccessToken(env) {
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: env.SPOTIFY_REFRESH_TOKEN,
		}),
	});

	const data = await res.json();
	if (!data.access_token) throw new Error('failed to get access token');
	return data.access_token;
}

async function getPlaylistInfo(playlistId, accessToken) {
	const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,images`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!res.ok) return { name: null, coverUrl: null };

	const data = await res.json();
	return {
		name: data.name ?? null,
		coverUrl: data.images?.[0]?.url ?? null,
	};
}

async function getContextInfo(context, accessToken) {
	if (!context) return null;

	const uriParts = context.uri.split(':');
	const type = uriParts[1];
	const id = uriParts[2];
	const url = `https://open.spotify.com/${type}/${id}`;

	if (type === 'collection') {
		return CONTEXT_FALLBACKS.collection;
	}

	if (type === 'playlist') {
		const known = KNOWN_PLAYLISTS[id];
		if (known) {
			return { ...known, url };
		}
		const info = await getPlaylistInfo(id, accessToken);
		return { name: info.name, url, coverUrl: info.coverUrl };
	}

	if (type === 'album') {
		return { name: null, url, coverUrl: null };
	}

	if (type === 'artist') {
		return { name: null, url, coverUrl: null };
	}

	return null;
}

function formatTrack(track, isPlaying, context) {
	return {
		isPlaying,
		title: track.name,
		artist: track.artists.map((a) => a.name).join(', '),
		album: track.album.name,
		albumArt: track.album.images[0].url,
		trackUrl: track.external_urls.spotify,
		context,
	};
}

async function fetchSpotifyData(env) {
	const accessToken = await getAccessToken(env);

	const nowPlayingRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (nowPlayingRes.status === 200) {
		const nowPlaying = await nowPlayingRes.json();

		if (nowPlaying.is_playing) {
			const context = await getContextInfo(nowPlaying.context, accessToken);
			return formatTrack(nowPlaying.item, true, context);
		}
	}

	// not playing or paused — fall back to recently played
	const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!recentRes.ok) throw new Error('failed to fetch recently played');

	const recentData = await recentRes.json();
	const item = recentData.items[0];
	const context = item.context ? await getContextInfo(item.context, accessToken) : null;

	return formatTrack(item.track, false, context);
}

export async function handleSpotify(request, env, ctx) {
	const cache = caches.default;
	const cached = await cache.match(CACHE_KEY);
	if (cached) return new Response(cached.body, cached);

	try {
		const data = await fetchSpotifyData(env);
		const res = jsonResponse(data, request, 200, CACHE_TTL);
		ctx.waitUntil(cache.put(CACHE_KEY, res.clone()));
		return res;
	} catch (err) {
		return errorResponse(err.message, request, 500);
	}
}
