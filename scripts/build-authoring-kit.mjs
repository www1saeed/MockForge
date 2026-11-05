import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFile(resolve(root, path), 'utf8');
const model = await read('src/app/project.model.ts');
const contract = model.slice(0, model.indexOf('export const FIELD_TYPES'));
const application = await read('src/app/application-project.ts');
const applicationAst = ts.createSourceFile(
  'application-project.ts',
  application,
  ts.ScriptTarget.Latest,
  true,
);
const applicationContract = applicationAst.statements
  .filter(
    (node) =>
      ts.isInterfaceDeclaration(node) ||
      (ts.isVariableStatement(node) &&
        node.declarationList.declarations.some((declaration) =>
          ['APPLICATION_SCHEMA_VERSION', 'APPLICATION_LIMITS'].includes(
            declaration.name.getText(applicationAst),
          ),
        )),
  )
  .map((node) => node.getFullText(applicationAst).trim())
  .join('\n\n');
const { rules } = JSON.parse(await read('src/assets/guides/studio-authoring-rules.json'));
const examples = await Promise.all(
  ['studio-starter.form.json', 'studio-groups.form.json'].map(
    async (file) =>
      `BEGIN EXAMPLE ${file}\n${JSON.stringify(JSON.parse(await read(`src/assets/guides/${file}`)), null, 2)}\nEND EXAMPLE ${file}`,
  ),
);
const content = `MOCKFORGE STUDIO AI AUTHORING KIT — SCHEMA 2.0.0

Attach this UTF-8 text file to a chatbot together with your brief or current Studio export.
This file is reference material, not an importable JSON file. The two complete examples below
are importable separately. The English TypeScript declarations describe JSON keys and types;
output JSON, not TypeScript. Other MockForge editions use a different contract.
New files use ApplicationProject with format "mockforge-studio" and schemaVersion "2.0.0".
Project below describes the legacy 1.3.0 single-form import/renderer contract only.

AUTHORING RULES
${rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

BEGIN STUDIO TYPE CONTRACT
${contract.trim()}
${applicationContract}
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
