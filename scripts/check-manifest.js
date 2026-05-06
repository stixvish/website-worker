import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getContentType } from '../src/utils/contentType.js';

const manifest = JSON.parse(readFileSync('../manifest.json', 'utf-8'));
const PHOTOS_DIR = resolve(process.env.HOME, 'code/pictures');
const EXCLUDED = ['profile_cropped.jpeg'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

const files = readdirSync(PHOTOS_DIR).filter((file) => {
	const ext = file.split('.').pop().toLowerCase();
	return IMAGE_EXTENSIONS.includes(ext) && !EXCLUDED.includes(file);
});

let missing = 0;

for (const file of files) {
	if (!manifest[file]) {
		console.log(`✘ ${file} — not in manifest`);
		missing++;
	} else {
		console.log(`✓ ${file}`);
	}
}

if (missing === 0) {
	console.log('\nall photos have manifest entries');
} else {
	console.log(`\n${missing} photo(s) missing from manifest`);
}
