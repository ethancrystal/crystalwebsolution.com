import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CAPTURE_PROGRESS, REFERENCE_VIEWPORTS } from '../lib/v2/motion-tokens.js';
import { V2_SCENES, captureId } from '../lib/v2/visual-regression.js';

const COLUMNS = [
  'viewport_id',
  'scene_id',
  'frame_id',
  'progress',
  'scroll_y',
  'section_top',
  'section_height',
  'grid_left',
  'grid_right',
  'column_gap',
  'heading_x',
  'heading_y',
  'heading_width',
  'heading_height',
  'media_x',
  'media_y',
  'media_width',
  'media_height',
  'trigger_start',
  'trigger_end',
  'pin_distance',
  'duration',
  'stagger',
  'ease',
  'notes',
  'source_file',
];

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const rows = [COLUMNS];

for (const viewport of REFERENCE_VIEWPORTS) {
  for (const sceneId of V2_SCENES) {
    for (const progress of CAPTURE_PROGRESS) {
      rows.push([
        viewport.id,
        sceneId,
        captureId(viewport.id, sceneId, progress),
        progress,
        ...Array(COLUMNS.length - 4).fill(''),
      ]);
    }
  }
}

const csv = `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, '../docs/reference/measurement-sheet.csv');

await writeFile(output, csv, 'utf8');
console.log(`Wrote ${rows.length - 1} measurement rows to ${output}`);
