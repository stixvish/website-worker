import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('router', () => {
	it('returns 404 for unknown routes', async () => {
		const request = new Request('http://example.com/unknown');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it('routes /images correctly', async () => {
		const response = await SELF.fetch('http://example.com/images');
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(Array.isArray(body)).toBe(true);
	});
});
