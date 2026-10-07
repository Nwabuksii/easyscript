// easyScript compiler: .ej/.et source -> JS/TS source.
// Tokenizes first, so strings, comments, regex and template text are never rewritten.

// Rewrite `print . out` (any whitespace between) to a single `console.log` token.
function rewritePrintOut(toks) {
  const out = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (t.type === 'id' && t.text === 'print') {
      let j = i + 1;
      while (j < toks.length && (toks[j].type === 'ws' || toks[j].type === 'cmt')) j++;
      if (toks[j]?.type === 'p' && toks[j].text === '.') {
        j++;
        while (j < toks.length && (toks[j].type === 'ws' || toks[j].type === 'cmt')) j++;
        if (toks[j]?.type === 'id' && toks[j].text === 'out') {
          out.push({ type: 'id', text: 'console.log', pos: t.pos });
          i = j + 1;
          continue;
        }
      }
    }
    out.push(t);
    i++;
  }
  return out;
}
export class EasyError extends Error {}

export const MAP = Object.assign(Object.create(null), {
  fixed: 'const', make: 'let', mutable: 'var', when: 'if', othen: 'else if', ifnot: 'else',
  match: 'switch', option: 'case', other: 'default', runtill: 'for', keeprun: 'while', exec: 'do',
  stop: 'break', skip: 'continue', block: 'function', send: 'return', pending: 'async',
  waitfor: 'await', bring: 'import', give: 'export', bprint: 'class', contract: 'interface',
  inherits: 'extends', follows: 'implements', setup: 'constructor', self: 'this',
  is: '===', isnot: '!==', and: '&&', or: '||',
});
// standard keyword -> easy replacement (only the word-like ones are banned)
const BAN = Object.assign(Object.create(null), Object.fromEntries(Object.entries(MAP).filter(([, v]) => /^\w+$/.test(v)).map(([k, v]) => [v, k])));
const DECL = new Set(['make', 'fixed', 'mutable', 'block', 'bprint', 'contract']);
const CTRL = new Set(['return', 'break', 'continue', 'else', 'do', 'default']);
const REGEX_AFTER = new Set([...Object.keys(MAP), ...Object.values(MAP), 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield']);
REGEX_AFTER.delete('self'); REGEX_AFTER.delete('this');

function lex(src) {
  const toks = [], stack = [];
  let i = 0, depth = 0;
  const push = (type, s, e) => toks.push({ type, text: src.slice(s, e), pos: s });
  const prev = () => toks.findLast((t) => t.type !== 'ws' && t.type !== 'cmt');
  // template chunk starting at s (a backtick or the } closing a ${ }); ends at ` or ${
  const tpl = (s) => {
    for (let j = s + 1; j < src.length; j++) {
      if (src[j] === '\\') j++;
      else if (src[j] === '`') { push('str', s, j + 1); return j + 1; }
      else if (src[j] === '$' && src[j + 1] === '{') { push('str', s, j + 2); stack.push(depth); depth = 0; return j + 2; }
    }
    return src.length;
  };
  const rest = () => src.slice(i);
  while (i < src.length) {
    const c = src[i];
    let m;
    if ((m = /^\s+/.exec(rest()))) { push('ws', i, i + m[0].length); i += m[0].length; }
    else if ((c === '#' && src[i + 1] === '!' && i === 0) || (c === '/' && src[i + 1] === '/')) {
      const e = src.indexOf('\n', i); const end = e < 0 ? src.length : e; push('cmt', i, end); i = end;
    } else if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2); const end = e < 0 ? src.length : e + 2; push('cmt', i, end); i = end;
    } else if (c === '"' || c === "'") {
      let j = i + 1; while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      push('str', i, j + 1); i = j + 1;
    } else if (c === '`') i = tpl(i);
    else if (c === '}' && stack.length && depth === 0) { depth = stack.pop(); i = tpl(i); }
    else if (c === '/' && (() => { const p = prev(); return !p || (p.type === 'p' ? !/^([)\]}]|\+\+|--)$/.test(p.text) : p.type === 'id' && REGEX_AFTER.has(p.text)); })()) {
      let j = i + 1, cls = false;
      while (j < src.length && (cls || src[j] !== '/') && src[j] !== '\n') { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      j++; while (/[a-z]/i.test(src[j] ?? '')) j++;
      push('re', i, j); i = j;
    } else if ((m = /^#?[\p{L}_$][\p{L}\p{N}_$]*/u.exec(rest()))) { push('id', i, i + m[0].length); i += m[0].length; }
    else if ((m = /^\d[\w.]*/.exec(rest()))) { push('num', i, i + m[0].length); i += m[0].length; }
    else {
      m = /^(\.\.\.|\?\.(?!\d)|=>|.)/s.exec(rest()); push('p', i, i + m[0].length); i += m[0].length;
      if (c === '{') depth++; else if (c === '}') depth--;
    }
  }
  return toks;
}

export function compile(src, file = 'input') {
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);   // strip UTF-8 BOM
  const lines = src.split('\n');
  const fail = (pos, msg) => {
    const before = src.slice(0, pos).split('\n'), line = before.length, col = before.at(-1).length + 1;
    throw new EasyError(`[Easy Compile Error] ${file}:${line}:${col}\n  ${msg}\n  ${line} | ${lines[line - 1]}`);
  };
  const toks = rewritePrintOut(lex(src));
  const sig = toks.filter((t) => t.type !== 'ws' && t.type !== 'cmt');
  // newline between a significant token and the one before it => statement start
  const nlBefore = new Map();
  toks.forEach((t, k) => { if (t.type === 'ws' && t.text.includes('\n')) { const nx = toks.slice(k).find((x) => x.type !== 'ws' && x.type !== 'cmt'); if (nx) nlBefore.set(nx, true); } });
  const cmtNl = (t) => nlBefore.get(t);

  const braces = []; let m = null; let si = 0; let out = '';
  for (const t of toks) {
    if (t.type === 'ws' || t.type === 'cmt') { out += t.text; continue; }
    const p = sig[si - 1]?.text, n = sig[si + 1]?.text; si++;
    if (t.type !== 'id') {
      if (t.text === '(' && m && !m.ready) m.pd++;
      else if (t.text === ')' && m && !m.ready && --m.pd === 0) m.ready = true;
      else if (t.text === '{') { braces.push(!!m?.ready); if (m?.ready) m = null; }
      else if (t.text === '}') braces.pop();
      out += t.text; continue;
    }
    const w = t.text;
    const stmt = p === undefined || cmtNl(t) || /^[{;}):]$/.test(p);
    const inMatch = braces.at(-1) === true && stmt;
    const isKey = n === ':' && (p === '{' || p === ',');
    let r = w;
    if (p === '.' || p === '?.') r = w;
    else if (w === 'option' && inMatch) r = 'case';
    else if (w === 'other' && inMatch && n === ':') r = 'default';
    else if (isKey) r = w;
    else if (w === 'match') { if (stmt && n === '(') { r = 'switch'; m = { pd: 0, ready: false }; } }
    else if (MAP[w] && w !== 'option' && w !== 'other') r = MAP[w];
    else if (w === 'other' || w === 'option') r = w;
    else if (BAN[w] && !(w === 'default' && p === 'give') && !DECL.has(p) && !(!CTRL.has(w) && /^[),;=.\]}]$/.test(n))) {
      const use = w === 'else' && n === 'if' ? 'othen' : BAN[w];
      fail(t.pos, `Standard keyword '${w}' is not allowed. Use '${use}' instead.`);
    }
    out += r;
  }
  return out;
}
