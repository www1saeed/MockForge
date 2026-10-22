import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFile(resolve(root, path), 'utf8');
const model = await read('src/app/project.model.ts');
const contract = model.slice(0, model.indexOf('export const FIELD_TYPES'));
const { rules } = JSON.parse(await read('src/assets/guides/studio-authoring-rules.json'));
const examples = await Promise.all(
  ['studio-starter.form.json', 'studio-groups.form.json'].map(
    async (file) =>
      `BEGIN EXAMPLE ${file}\n${JSON.stringify(JSON.parse(await read(`src/assets/guides/${file}`)), null, 2)}\nEND EXAMPLE ${file}`,
  ),
);
const content = `MOCKFORGE STUDIO AI AUTHORING KIT — SCHEMA 1.3.0

Attach this UTF-8 text file to a chatbot together with your brief or current Studio export.
This file is reference material, not an importable JSON file. The two complete examples below
are importable separately. The English TypeScript declarations describe JSON keys and types;
output JSON, not TypeScript. Other MockForge editions use a different contract.

AUTHORING RULES
${rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

BEGIN STUDIO TYPE CONTRACT
${contract.trim()}
END STUDIO TYPE CONTRACT

${examples.join('\n\n')}
`;
const target = 'src/assets/guides/studio-ai-authoring-kit.txt';
if (process.argv.includes('--check')) {
  if ((await read(target)) !== content)
    throw new Error('Authoring kit is stale. Run npm run authoring:build.');
  process.stdout.write('Authoring kit matches the model, rules and complete examples.\n');
} else {
  await writeFile(resolve(root, target), content, 'utf8');
  process.stdout.write(`Updated ${target}\n`);
}
