interface PatternAtom {
  alphabet: string;
  min: number;
  max: number;
}
interface PatternPlan {
  atoms: PatternAtom[];
  min: number;
  max: number;
  matcher: RegExp;
}
const DIGITS = '0123456789';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const ESCAPES: Record<string, string> = {
  d: DIGITS,
  w: LETTERS + LETTERS.toUpperCase() + DIGITS + '_',
  s: ' ',
  t: '\t',
  n: '\n',
  r: '\r',
};
const cache = new Map<string, PatternPlan | null>();

/** Finite concatenation only: no groups, alternatives, properties, backreferences or unbounded repeats. */
function parsePattern(pattern: string): PatternPlan | null {
  if (!pattern || pattern.length > 256) return null;
  let source = pattern.startsWith('^') ? pattern.slice(1) : pattern;
  if (source.endsWith('$') && !source.endsWith('\\$')) source = source.slice(0, -1);
  const atoms: PatternAtom[] = [];
  let variables = 0;
  for (let index = 0; index < source.length;) {
    let alphabet = '';
    const char = source[index++];
    if (char === '[') {
      const end = source.indexOf(']', index);
      if (end < 0) return null;
      const content = source.slice(index, end);
      if (!/^[a-zA-Z0-9-]+$/.test(content)) return null;
      for (let cursor = 0; cursor < content.length; cursor++) {
        if (content[cursor + 1] === '-') {
          const start = content.charCodeAt(cursor),
            finish = content.charCodeAt(cursor + 2);
          if (!Number.isFinite(finish) || finish < start || finish - start > 64) return null;
          for (let code = start; code <= finish; code++) {
            if (!/[a-zA-Z0-9]/.test(String.fromCharCode(code))) return null;
            alphabet += String.fromCharCode(code);
          }
          cursor += 2;
        } else if (content[cursor] === '-') return null;
        else alphabet += content[cursor];
      }
      index = end + 1;
    } else if (char === '\\') {
      const escape = source[index++];
      alphabet = ESCAPES[escape] ?? (/^[\\^$.*+?()[\]{}|/-]$/.test(escape ?? '') ? escape : '');
    } else if (/^[a-zA-Z0-9 _:/@,.-]$/.test(char)) alphabet = char === '.' ? '' : char;
    else return null;
    if (!alphabet || alphabet.length > 128) return null;
    let min = 1,
      max = 1;
    if (source[index] === '?') {
      min = 0;
      index++;
    } else if (source[index] === '{') {
      const match = /^\{(\d{1,3})(?:,(\d{1,3}))?\}/.exec(source.slice(index));
      if (!match) return null;
      min = Number(match[1]);
      max = Number(match[2] ?? match[1]);
      index += match[0].length;
      if (max < min || max > 100) return null;
    }
    if (min !== max && ++variables > 1) return null;
    atoms.push({ alphabet, min, max });
    if (atoms.length > 64) return null;
  }
  const min = atoms.reduce((sum, atom): number => sum + atom.min, 0);
  const max = atoms.reduce((sum, atom): number => sum + atom.max, 0);
  if (!atoms.length || max > 512) return null;
  try {
    return { atoms, min, max, matcher: new RegExp(`^(?:${pattern})$`, 'v') };
  } catch {
    return null;
  }
}

function plan(pattern: string): PatternPlan | null {
  if (cache.has(pattern)) return cache.get(pattern)!;
  const result = parsePattern(pattern);
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(pattern, result);
  return result;
}

export function isBoundedPattern(pattern: string): boolean {
  return plan(pattern) !== null;
}

/** Reuse the admitted plan's matcher; no arbitrary expression is ever compiled here. */
export function boundedPatternMatches(pattern: string, value: string): boolean | null {
  return plan(pattern)?.matcher.test(value) ?? null;
}

/** At most one variable atom makes both construction and native matching predictably bounded. */
export function boundedPatternCandidate(
  pattern: string,
  ordinal: number,
  desiredLength?: number,
): string | null {
  const parsed = plan(pattern);
  if (!parsed) return null;
  let extra = Math.max(
    0,
    Math.min(parsed.max - parsed.min, (desiredLength ?? parsed.min) - parsed.min),
  );
  let offset = Math.abs(Math.trunc(Number.isFinite(ordinal) ? ordinal : 0));
  return parsed.atoms
    .map((atom): string => {
      const added = Math.min(extra, atom.max - atom.min);
      extra -= added;
      return Array.from(
        { length: atom.min + added },
        (): string => atom.alphabet[offset++ % atom.alphabet.length],
      ).join('');
    })
    .join('');
}
