import { jsonResponse, errorResponse } from '../utils/response.js';

const KNOWN_PLAYLISTS = {
	'37i9dQZF1FbFLUWEjHnucn': 'Daylist',
	'37i9dQZEVXcTSfAWcLwg77': 'Discover Weekly',
	'37i9dQZEVXbdOgSQQ4vq0e': 'Release Radar',
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
	return data.access_token;
}

async function getPlaylistName(playlistId, accessToken) {
	const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	const data = await res.json();
	return data.name ?? null;
}

async function getContextInfo(context, accessToken) {
	if (!context) return null;

	const uriParts = context.uri.split(':');
	const type = uriParts[1];
	const id = uriParts[2];
	const url = `https://open.spotify.com/${type}/${id}`;

	if (type === 'collection') {
		return {
			name: 'Liked Songs',
			url: 'https://open.spotify.com/collection/tracks',
		};
	}

	if (type === 'playlist') {
		const knownName = KNOWN_PLAYLISTS[id];
		if (knownName) {
			return { name: knownName, url };
		}
		const fetchedName = await getPlaylistName(id, accessToken);
		return { name: fetchedName, url };
	}

	if (type === 'album') {
		return { name: null, url };
	}

	if (type === 'artist') {
		return { name: null, url };
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

export async function handleSpotify(request, env) {
	let accessToken;

	try {
		accessToken = await getAccessToken(env);
	} catch {
		return errorResponse('failed to get access token', request, 500);
	}

	const nowPlayingRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (nowPlayingRes.status === 204 || nowPlayingRes.status !== 200) {
		const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!recentRes.ok) {
			return errorResponse('failed to fetch recently played', request, 500);
		}

		const recentData = await recentRes.json();
		const track = recentData.items[0].track;

		return jsonResponse(formatTrack(track, false, null), request, 200, 30);
	}

	const nowPlaying = await nowPlayingRes.json();
	const track = nowPlaying.item;
	const context = await getContextInfo(nowPlaying.context, accessToken);

	return jsonResponse(formatTrack(track, true, context), request, 200, 30);
}
