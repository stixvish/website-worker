import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import imageSize from 'image-size';
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

async function isMetadataFresh(key, entry) {
	try {
		const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
		return (
			head.Metadata?.alt === entry.alt && head.Metadata?.width === String(entry.width) && head.Metadata?.height === String(entry.height)
		);
	} catch {
		return false;
	}
}

async function upload(file, entry) {
	const filePath = resolve(PHOTOS_DIR, file);
	const body = readFileSync(filePath);
	const contentType = getContentType(file);

	await client.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: file,
			Body: body,
			ContentType: contentType,
			Metadata: {
				alt: entry.alt,
				width: String(entry.width),
				height: String(entry.height),
			},
		}),
	);
}

async function syncManifest() {
	await client.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: 'manifest.json',
			Body: JSON.stringify(manifest, null, 2),
			ContentType: 'application/json',
		}),
	);
	console.log('✓ manifest.json — synced');
}

function getOrInjectDimensions(file, existingEntry) {
	if (existingEntry?.width && existingEntry?.height) return existingEntry;

	const filePath = resolve(PHOTOS_DIR, file);
	const buffer = readFileSync(filePath);
	const { width, height } = imageSize(new Uint8Array(buffer));

	const updated = {
		alt: typeof existingEntry === 'string' ? existingEntry : (existingEntry?.alt ?? file),
		width,
		height,
	};

	manifest[file] = updated;
	return updated;
}

async function main() {
	console.log('fetching existing R2 objects...');
	const existingKeys = await getExistingKeys();

	let uploaded = 0;
	let skipped = 0;
	let failed = 0;

	for (const [file, value] of Object.entries(manifest)) {
		const entry = getOrInjectDimensions(file, value);
		const alreadyExists = existingKeys.has(file);

		if (alreadyExists && (await isMetadataFresh(file, entry))) {
			console.log(`↩ ${file} — up to date`);
			skipped++;
			continue;
		}

		try {
			await upload(file, entry);
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
