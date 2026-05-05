import { describe, it, expect } from 'vitest';
import { filterKeys, selectRandom, buildUrls, EXCLUDED_KEYS, BASE_URL, SELECTION_COUNT } from '../../src/routes/images.js';

function mockBucketObjects(count) {
	return Array.from({ length: count }, (_, i) => ({ key: `photo${i}.jpeg` }));
}

const mockObjects = [...mockBucketObjects(17), { key: 'profile.jpeg' }, { key: 'profile_cropped.jpeg' }];

describe('filterKeys', () => {
	it('excludes profile photos', () => {
		const keys = filterKeys(mockObjects);
		EXCLUDED_KEYS.forEach((excluded) => {
			expect(keys).not.toContain(excluded);
		});
	});

	it('returns all non-excluded keys', () => {
		const keys = filterKeys(mockObjects);
		expect(keys).toHaveLength(mockObjects.length - EXCLUDED_KEYS.length);
	});

	it('handles an empty bucket', () => {
		const keys = filterKeys([]);
		expect(keys).toHaveLength(0);
	});

	it('handles a bucket with only excluded files', () => {
		const keys = filterKeys([{ key: 'profile.jpeg' }, { key: 'profile_cropped.jpeg' }]);
		expect(keys).toHaveLength(0);
	});
});

describe('selectRandom', () => {
	const keys = filterKeys(mockObjects);

	it(`returns exactly ${SELECTION_COUNT} items`, () => {
		const selected = selectRandom(keys);
		expect(selected).toHaveLength(SELECTION_COUNT);
	});

	it('returns a subset of the input keys', () => {
		const selected = selectRandom(keys);
		selected.forEach((key) => {
			expect(keys).toContain(key);
		});
	});

	it('does not return duplicate keys', () => {
		const selected = selectRandom(keys);
		const unique = new Set(selected);
		expect(unique.size).toBe(selected.length);
	});

	it('returns different orderings on subsequent calls', () => {
		const first = selectRandom(keys);
		const second = selectRandom(keys);
		expect(first).not.toEqual(second);
	});

	it('returns all keys if count exceeds available keys', () => {
		const smallList = ['a.jpeg', 'b.jpeg', 'c.jpeg'];
		const selected = selectRandom(smallList, 10);
		expect(selected).toHaveLength(smallList.length);
	});
});

describe('buildUrls', () => {
	it('prepends base URL to each key', () => {
		const keys = ['photo1.jpeg', 'photo2.jpeg'];
		const urls = buildUrls(keys);
		expect(urls).toEqual([`${BASE_URL}/photo1.jpeg`, `${BASE_URL}/photo2.jpeg`]);
	});

	it('returns the same number of URLs as keys', () => {
		const keys = filterKeys(mockObjects);
		const urls = buildUrls(keys);
		expect(urls).toHaveLength(keys.length);
	});

	it('handles empty array', () => {
		expect(buildUrls([])).toEqual([]);
	});
});
