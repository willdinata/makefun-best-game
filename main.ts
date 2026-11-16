import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Anchor input paths beside this module so the command can run from any directory.
const projectDir = dirname(fileURLToPath(import.meta.url));
const deliveryDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Transfer the playable bundle and, when present, its prepared captures.
function copyFolder(folderName) {
  cpSync(join(projectDir, folderName), join(deliveryDir, folderName), { recursive: true });
}

mkdirSync(deliveryDir, { recursive: true });
copyFolder('game');
if (existsSync(join(projectDir, 'screenshots'))) copyFolder('screenshots');

// Keep the dossier's declared limits aligned with the competition intake rules.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossierBytes = buildDossier(deliveryDir, dossierCaps);
writeFileSync(join(deliveryDir, 'dossier.json'), dossierBytes);
