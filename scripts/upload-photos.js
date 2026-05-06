import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getContentType } from '../src/utils/contentType.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new S3Client({
	region: 'auto',
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY,
		secretAccessKey: process.env.R2_SECRET_KEY,
	},
	forcePathStyle: true,
});

const BUCKET = 'gallery';
const PHOTOS_DIR = `${process.env.HOME}/code/pictures`;
const MANIFEST_PATH = resolve(__dirname, '../manifest.json');
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

async function getExistingKeys() {
	const list = await client.send(new ListObjectsV2Command({ Bucket: BUCKET }));
	return new Set((list.Contents ?? []).map((obj) => obj.Key));
}

async function isMetadataFresh(key, expectedAlt) {
	try {
		const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
		return head.Metadata?.alt === expectedAlt;
	} catch {
		return false;
	}
}

async function upload(file, alt) {
	const filePath = resolve(PHOTOS_DIR, file);
	const body = readFileSync(filePath);
	const contentType = getContentType(file);

	await client.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: file,
			Body: body,
			ContentType: contentType,
			Metadata: { alt },
		}),
	);
}

async function syncManifest() {
	await client.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: 'manifest.json',
			Body: readFileSync(MANIFEST_PATH),
			ContentType: 'application/json',
		}),
	);
	console.log('✓ manifest.json — synced');
}

async function main() {
	console.log('fetching existing R2 objects...');
	const existingKeys = await getExistingKeys();

	let uploaded = 0;
	let skipped = 0;
	let failed = 0;

	for (const [file, alt] of Object.entries(manifest)) {
		const alreadyExists = existingKeys.has(file);

		if (alreadyExists && (await isMetadataFresh(file, alt))) {
			console.log(`↩ ${file} — up to date`);
			skipped++;
			continue;
		}

		try {
			await upload(file, alt);
			const reason = !alreadyExists ? 'new' : 'metadata changed';
			console.log(`✓ ${file} — ${reason}`);
			uploaded++;
		} catch (err) {
			console.error(`✘ ${file}: ${err.message}`);
			failed++;
		}
	}

	await syncManifest();

	console.log(`\ndone — ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
}

main();
