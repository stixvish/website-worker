import { describe, it, expect } from 'vitest';
import { filterKeys, selectRandom, buildPhotos, EXCLUDED_KEYS, BASE_URL, SELECTION_COUNT } from '../../src/routes/images.js';

const mockManifest = {
	'austinSign.JPG': 'austin, in front of neon sign',
	'boys.webp': 'home, hanging with the homies',
	'celeste.jpeg': 'chicago, with the chipotle crew',
	'flagstaff.jpeg': 'flagstaff, on the snowbowl',
	'fortMirror.jpeg': 'jaipur, fort mirror reflection',
	'frontBoat.jpeg': 'san diego, front of the boat',
	'lapse.jpeg': 'home, in a parking lot',
	'moneygun.jpeg': 'chicago, in a bar called moneygun',
	'ncHotel.JPEG': 'chicago, in a hotel lobby',
	'nye.jpeg': 'chicago, new years eve 2024',
	'recess.jpeg': 'chicago, in a bar called recess',
	'rohanyc.jpeg': 'new york city, in a rooftop bar',
	'threeDots.jpeg': 'chicago, in a bar called three dots and a dash',
	'wallpaper.jpeg': 'austin, gazing out into the sky',
	'weddingBooth.jpeg': 'oak brook, at a wedding photo booth',
	'whiteCoat.JPEG': "kansas city, my brother's white coat ceremony",
};

const mockObjects = [
	...Object.keys(mockManifest).map((key) => ({ key })),
	{ key: 'profile.jpeg' },
	{ key: 'profile_cropped.jpeg' },
	{ key: 'manifest.json' },
];

describe('filterKeys', () => {
	it('excludes profile photos', () => {
		const keys = filterKeys(mockObjects);
		EXCLUDED_KEYS.forEach((excluded) => {
			expect(keys).not.toContain(excluded);
		});
	});

	it('excludes manifest.json', () => {
		const keys = filterKeys(mockObjects);
		expect(keys).not.toContain('manifest.json');
	});

	it('returns all non-excluded keys', () => {
		const keys = filterKeys(mockObjects);
		expect(keys).toHaveLength(mockObjects.length - EXCLUDED_KEYS.length);
	});

	it('handles an empty bucket', () => {
		expect(filterKeys([])).toHaveLength(0);
	});

	it('handles a bucket with only excluded files', () => {
		const keys = filterKeys([{ key: 'profile.jpeg' }, { key: 'profile_cropped.jpeg' }, { key: 'manifest.json' }]);
		expect(keys).toHaveLength(0);
	});
});

describe('selectRandom', () => {
	const keys = filterKeys(mockObjects);

	it(`returns exactly ${SELECTION_COUNT} items`, () => {
		expect(selectRandom(keys)).toHaveLength(SELECTION_COUNT);
	});

	it('returns a subset of the input keys', () => {
		const selected = selectRandom(keys);
		selected.forEach((key) => expect(keys).toContain(key));
	});

	it('does not return duplicate keys', () => {
		const selected = selectRandom(keys);
		expect(new Set(selected).size).toBe(selected.length);
	});

	it('returns different orderings on subsequent calls', () => {
		expect(selectRandom(keys)).not.toEqual(selectRandom(keys));
	});

	it('returns all keys if count exceeds available keys', () => {
		const smallList = ['a.jpeg', 'b.jpeg', 'c.jpeg'];
		expect(selectRandom(smallList, 10)).toHaveLength(smallList.length);
	});
});

describe('buildPhotos', () => {
	it('returns objects with url and alt', () => {
		const photos = buildPhotos(['austinSign.JPG'], mockManifest);
		expect(photos[0]).toHaveProperty('url');
		expect(photos[0]).toHaveProperty('alt');
	});

	it('prepends base URL to each key', () => {
		const photos = buildPhotos(['austinSign.JPG'], mockManifest);
		expect(photos[0].url).toBe(`${BASE_URL}/austinSign.JPG`);
	});

	it('uses alt from manifest', () => {
		const photos = buildPhotos(['austinSign.JPG'], mockManifest);
		expect(photos[0].alt).toBe(mockManifest['austinSign.JPG']);
	});

	it('falls back to key if not in manifest', () => {
		const photos = buildPhotos(['unknown.jpeg'], mockManifest);
		expect(photos[0].alt).toBe('unknown.jpeg');
	});

	it('returns the same number of photos as keys', () => {
		const keys = filterKeys(mockObjects);
		expect(buildPhotos(keys, mockManifest)).toHaveLength(keys.length);
	});

	it('handles empty array', () => {
		expect(buildPhotos([], mockManifest)).toEqual([]);
	});
});
