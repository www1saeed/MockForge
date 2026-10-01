import { readFileSync } from 'node:fs';
import ts from 'typescript';

function catalog(file, variable) {
  const content = readFileSync(new URL(file, import.meta.url), 'utf8');
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  let object;
  function inspect(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === variable) {
      object = ts.isSatisfiesExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  if (!object || !ts.isObjectLiteralExpression(object)) throw new Error(`Missing ${variable}`);
  return { source, properties: object.properties };
}

const base = catalog('../src/app/translations.ts', 'copy');
const persian = catalog('../src/app/translations.fa.ts', 'faCopy');
const baseKeys = new Set();
for (const property of base.properties) {
  if (!ts.isPropertyAssignment(property)) throw new Error('Unsupported base catalog entry');
  const value = property.initializer;
  if (
    !ts.isArrayLiteralExpression(value) ||
    value.elements.length !== 2 ||
    !value.elements.every((item) => ts.isStringLiteral(item) && item.text.trim())
  ) {
    throw new Error(
      `Missing German/English translation pair: ${property.name.getText(base.source)}`,
    );
  }
  baseKeys.add(property.name.getText(base.source));
}
const persianKeys = new Set();
for (const property of persian.properties) {
  if (
    !ts.isPropertyAssignment(property) ||
    !ts.isStringLiteral(property.initializer) ||
    !property.initializer.text.trim()
  ) {
    throw new Error(`Missing Persian translation: ${property.name.getText(persian.source)}`);
  }
  persianKeys.add(property.name.getText(persian.source));
}
const missing = [...baseKeys].filter((key) => !persianKeys.has(key));
const extra = [...persianKeys].filter((key) => !baseKeys.has(key));
if (missing.length || extra.length) {
  throw new Error(
    `Persian catalog mismatch. Missing: ${missing.join(', ')}; extra: ${extra.join(', ')}`,
  );
}
console.log(`Verified ${baseKeys.size} German, English and Persian UI translations.`);
