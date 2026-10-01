import { readFileSync } from 'node:fs';
import ts from 'typescript';
const content = readFileSync(new URL('../src/app/translations.ts', import.meta.url), 'utf8');
const source = ts.createSourceFile('translations.ts', content, ts.ScriptTarget.Latest, true);
let count = 0;
function inspect(node) {
  if (ts.isPropertyAssignment(node)) {
    const value = node.initializer;
    if (
      !ts.isArrayLiteralExpression(value) ||
      value.elements.length !== 2 ||
      !value.elements.every((item) => ts.isStringLiteral(item) && item.text.trim())
    ) {
      throw new Error(`Missing German/English translation pair: ${node.name.getText(source)}`);
    }
    count++;
  }
  ts.forEachChild(node, inspect);
}
inspect(source);
if (!count) throw new Error('Empty translation catalog');
console.log(
  `Verified ${count} German/English UI pairs. Runtime catalogs replace XLIFF in this standalone project.`,
);
