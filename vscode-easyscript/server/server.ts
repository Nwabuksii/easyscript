// server/server.ts
import {
  createConnection, TextDocuments, ProposedFeatures,
  InitializeParams, InitializeResult, TextDocumentSyncKind,
  Diagnostic, DiagnosticSeverity, CompletionItem, CompletionItemKind,
  DocumentSymbol, SymbolKind, Range, Position,
  InsertTextFormat, DiagnosticTag, CompletionItemTag,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// ===============================================================
//  TOKENIZER
// ===============================================================

interface Token {
  text: string;
  line: number; col: number;
  kind: 'id' | 'keyword' | 'string' | 'number' | 'punct';
}

const KEYWORDS = new Set([
  'fixed','make','mutable','when','othen','ifnot','match','option','other',
  'runtill','keeprun','exec','stop','skip','block','send','pending','waitfor',
  'bring','give','bprint','contract','inherits','follows','setup','self',
  'is','isnot','and','or','print',
]);

const BANNED_STANDARD: Record<string, string> = {
  const:'fixed', let:'make', var:'mutable', if:'when', 'else if':'othen',
  else:'ifnot', switch:'match', case:'option', default:'other', for:'runtill',
  while:'keeprun', do:'exec', break:'stop', continue:'skip', function:'block',
  return:'send', async:'pending', await:'waitfor', import:'bring', export:'give',
  class:'bprint', interface:'contract', extends:'inherits', implements:'follows',
  constructor:'setup', this:'self', '===':'is', '!==':'isnot', '&&':'and', '||':'or',
};

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let line = 0, col = 0, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\n') { line++; col = 0; i++; continue; }
    if (/\s/.test(c)) { col++; i++; continue; }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') { i++; col++; }
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2; col += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        if (text[i] === '\n') { line++; col = 0; } else col++;
        i++;
      }
      i += 2; col += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const sl = line, sc = col;
      const quote = c; i++; col++;
      while (i < text.length && text[i] !== quote && text[i] !== '\n') {
        if (text[i] === '\\') { i += 2; col += 2; } else { i++; col++; }
      }
      if (i < text.length && text[i] === quote) { i++; col++; }
      tokens.push({ text: quote, line: sl, col: sc, kind: 'string' });
      continue;
    }
    if (/[a-zA-Z_$]/.test(c)) {
      const sc = col; let j = i;
      while (j < text.length && /[a-zA-Z0-9_$]/.test(text[j])) j++;
      const word = text.slice(i, j);
      tokens.push({ text: word, line, col: sc, kind: KEYWORDS.has(word) ? 'keyword' : 'id' });
      col += j - i; i = j; continue;
    }
    if (/\d/.test(c)) {
      const sc = col; let j = i;
      while (j < text.length && /[\d.]/.test(text[j])) j++;
      tokens.push({ text: text.slice(i, j), line, col: sc, kind: 'number' });
      col += j - i; i = j; continue;
    }
    tokens.push({ text: c, line, col, kind: 'punct' });
    col++; i++;
  }
  return tokens;
}

// ===============================================================
//  DIAGNOSTICS
// ===============================================================

function validate(document: TextDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const tokens = tokenize(document.getText());
  const sig = tokens.filter(t => t.kind !== 'string');

  // 1. Banned standard keywords used as keywords
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.kind !== 'id') continue;
    const idx = sig.indexOf(tok);
    const prev = sig[idx - 1];
    if (prev?.text === '.') continue;
    if (BANNED_STANDARD[tok.text]) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: Range.create(tok.line, tok.col, tok.line, tok.col + tok.text.length),
        message: `Standard keyword '${tok.text}' is not allowed. Use '${BANNED_STANDARD[tok.text]}' instead.`,
        source: 'easyScript',
      });
    }
  }

  // 2. Suggest print.out over console.log / info / warn / error / debug
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.text !== 'console') continue;
    const dot = tokens[i + 1];
    const method = tokens[i + 2];
    if (dot?.text !== '.' || !method) continue;
    if (!['log', 'info', 'warn', 'error', 'debug'].includes(method.text)) continue;
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: Range.create(t.line, t.col, method.line, method.col + method.text.length),
      message: `Use print.out() instead of console.${method.text}() for easyScript style.`,
      source: 'easyScript',
      tags: [DiagnosticTag.Unnecessary],
    });
  }

  // 3. Unmatched brackets
  const PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const CLOSE = new Set(['}', ')', ']']);
  const stack: Token[] = [];
  for (const tok of tokens) {
    if (PAIRS[tok.text]) stack.push(tok);
    else if (CLOSE.has(tok.text)) {
      if (!stack.length) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: Range.create(tok.line, tok.col, tok.line, tok.col + 1),
          message: `Unmatched '${tok.text}'`,
          source: 'easyScript',
        });
      } else {
        const open = stack.pop()!;
        if (PAIRS[open.text] !== tok.text) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: Range.create(open.line, open.col, open.line, open.col + 1),
            message: `Expected '${PAIRS[open.text]}' but found '${tok.text}'`,
            source: 'easyScript',
          });
        }
      }
    }
  }
  for (const open of stack) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: Range.create(open.line, open.col, open.line, open.col + 1),
      message: `Unmatched '${open.text}'`,
      source: 'easyScript',
    });
  }

  return diagnostics;
}

// ===============================================================
//  COMPLETIONS
// ===============================================================

const kw = (
  label: string, detail: string, snippet?: string,
  kind: CompletionItemKind = CompletionItemKind.Keyword
): CompletionItem => ({
  label, kind, detail,
  insertText: snippet ?? label,
  insertTextFormat: snippet ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
});

const KEYWORD_ITEMS: CompletionItem[] = [
  kw('fixed', 'const', 'fixed ${1:name} = ${2:value};'),
  kw('make', 'let', 'make ${1:name} = ${2:value};'),
  kw('mutable', 'var', 'mutable ${1:name} = ${2:value};'),
  kw('when', 'if', 'when (${1:condition}) {\n\t$0\n}'),
  kw('othen', 'else if', 'othen (${1:condition}) {\n\t$0\n}'),
  kw('ifnot', 'else', 'ifnot {\n\t$0\n}'),
  kw('match', 'switch', 'match (${1:value}) {\n\toption ${2:case}:\n\t\t$0\n\t\tstop;\n\tother:\n\t\tstop;\n}'),
  kw('option', 'case', 'option ${1:value}:'),
  kw('other', 'default', 'other:'),
  kw('runtill', 'for', 'runtill (make ${1:i} = 0; ${1:i} < ${2:len}; ${1:i}++) {\n\t$0\n}'),
  kw('keeprun', 'while', 'keeprun (${1:condition}) {\n\t$0\n}'),
  kw('exec', 'do', 'exec {\n\t$0\n} keeprun (${1:condition});'),
  kw('stop', 'break', 'stop;'),
  kw('skip', 'continue', 'skip;'),
  kw('block', 'function', 'block ${1:name}(${2:params}) {\n\t$0\n}'),
  kw('send', 'return', 'send ${1:value};'),
  kw('pending', 'async', 'pending block ${1:name}(${2:params}) {\n\t$0\n}'),
  kw('waitfor', 'await', 'waitfor ${1:promise}'),
  kw('bring', 'import', 'bring { ${1:member} } from "${2:./module}";'),
  kw('give', 'export', 'give ${1:member};'),
  kw('bprint', 'class', 'bprint ${1:Name} {\n\tsetup(${2:params}) {\n\t\t$0\n\t}\n}'),
  kw('contract', 'interface', 'contract ${1:Name} {\n\t${2:prop}: ${3:string};\n}'),
  kw('inherits', 'extends', 'inherits ${1:Parent}'),
  kw('follows', 'implements', 'follows ${1:Interface}'),
  kw('setup', 'constructor', 'setup(${1:params}) {\n\t$0\n}'),
  kw('self', 'this', 'self.${1:member}'),
  kw('is', '===', 'is ${1:value}'),
  kw('isnot', '!==', 'isnot ${1:value}'),
  kw('and', '&&', 'and ${1:value}'),
  kw('or', '||', 'or ${1:value}'),
];

// --- Built-in globals -------------------------------------------------

const GLOBAL_ITEMS: CompletionItem[] = [
  {
    label: 'print',
    kind: CompletionItemKind.Class,
    detail: 'print.out(value) — preferred console output',
    documentation: {
      kind: 'markdown',
      value: 'The easyScript output helper.\n\n```easyscript\nprint.out("Hello, world!");\n```\n\nCompiles to `console.log(...)`.',
    },
  },
  { label: 'Math', kind: CompletionItemKind.Class, detail: 'Math namespace' },
  { label: 'JSON', kind: CompletionItemKind.Class, detail: 'JSON namespace' },
  { label: 'Object', kind: CompletionItemKind.Class, detail: 'Object namespace' },
  { label: 'Array', kind: CompletionItemKind.Class, detail: 'Array namespace' },
  { label: 'String', kind: CompletionItemKind.Class, detail: 'String namespace' },
  { label: 'Number', kind: CompletionItemKind.Class, detail: 'Number namespace' },
  { label: 'Promise', kind: CompletionItemKind.Class, detail: 'Promise namespace' },
  { label: 'Date', kind: CompletionItemKind.Class, detail: 'Date namespace' },
  { label: 'RegExp', kind: CompletionItemKind.Class, detail: 'RegExp namespace' },
  { label: 'Error', kind: CompletionItemKind.Class, detail: 'Error constructor' },
  { label: 'Map', kind: CompletionItemKind.Class, detail: 'Map constructor' },
  { label: 'Set', kind: CompletionItemKind.Class, detail: 'Set constructor' },
  {
    label: 'console',
    kind: CompletionItemKind.Class,
    detail: 'Console API (prefer print.out)',
    tags: [CompletionItemTag.Deprecated],
  },
];

// --- Member completions after `.` -------------------------------------

const m = (label: string, detail?: string, snippet?: string): CompletionItem => ({
  label, kind: CompletionItemKind.Method, detail,
  insertText: snippet ?? label,
  insertTextFormat: snippet ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
});

const MEMBERS: Record<string, CompletionItem[]> = {
  print: [
    m('out', 'print.out(value) — print to console', 'out(${1:value})'),
  ],
  console: [
    m('log', 'Prefer print.out()', 'log(${1:value})'),
    m('error', 'Prefer print.out()', 'error(${1:value})'),
    m('warn', 'Prefer print.out()', 'warn(${1:value})'),
    m('info', 'Prefer print.out()', 'info(${1:value})'),
    m('debug', 'Prefer print.out()', 'debug(${1:value})'),
    m('table', 'Log a table', 'table(${1:value})'),
    m('time', 'Start a timer', 'time("${1:label}")'),
    m('timeEnd', 'End a timer', 'timeEnd("${1:label}")'),
    m('clear', 'Clear the console', 'clear()'),
    m('assert', 'Assert a condition', 'assert(${1:condition})'),
  ],
  Math: [
    m('abs'), m('ceil'), m('floor'), m('round'), m('max'), m('min'),
    m('pow'), m('sqrt'), m('random'), m('trunc'), m('sign'),
    m('sin'), m('cos'), m('tan'), m('log'), m('exp'), m('log2'), m('log10'),
    { label: 'PI', kind: CompletionItemKind.Constant, detail: 'Math.PI' },
    { label: 'E', kind: CompletionItemKind.Constant, detail: 'Math.E' },
  ],
  JSON: [
    m('parse', 'Parse a JSON string', 'parse(${1:json})'),
    m('stringify', 'Convert to JSON string', 'stringify(${1:value})'),
  ],
  Object: [
    m('keys'), m('values'), m('entries'), m('assign'),
    m('freeze'), m('seal'), m('create'), m('fromEntries'),
  ],
  Array: [
    m('isArray'), m('from'), m('of'),
  ],
  String: [
    m('fromCharCode'), m('fromCodePoint'), m('raw'),
  ],
  Number: [
    m('isInteger'), m('isFinite'), m('isNaN'), m('parseFloat'), m('parseInt'),
  ],
  Promise: [
    m('resolve'), m('reject'), m('all'), m('allSettled'), m('race'), m('any'),
  ],
  Date: [
    m('now'), m('parse'), m('UTC'),
  ],
};

// ---- Local symbols ---------------------------------------------------

interface EZSymbol {
  name: string;
  kind: 'function' | 'variable' | 'class';
  line: number; col: number;
}

function collectSymbols(document: TextDocument): EZSymbol[] {
  const symbols: EZSymbol[] = [];
  const tokens = tokenize(document.getText());
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const next = tokens[i + 1];
    if (!next) continue;
    if (tok.text === 'block' && next.kind === 'id') {
      symbols.push({ name: next.text, kind: 'function', line: next.line, col: next.col });
    }
    if (tok.text === 'bprint' && next.kind === 'id') {
      symbols.push({ name: next.text, kind: 'class', line: next.line, col: next.col });
    }
    if ((tok.text === 'fixed' || tok.text === 'make' || tok.text === 'mutable') && next.kind === 'id') {
      symbols.push({ name: next.text, kind: 'variable', line: next.line, col: next.col });
    }
  }
  return symbols;
}

// ---- Member context detection ----------------------------------------

function getMemberReceiver(text: string, offset: number): string | null {
  const before = text.slice(0, offset);
  const match = before.match(/([A-Za-z_$][\w$]*)\s*\.\s*[\w$]*$/);
  return match ? match[1] : null;
}

// ---- Completion entry point ------------------------------------------

function provideCompletions(document: TextDocument, position: Position): CompletionItem[] {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const receiver = getMemberReceiver(text, offset);

  if (receiver) {
    const members = MEMBERS[receiver];
    if (members) return members;
    // Generic fallback for unknown receivers
    return [
      m('length'), m('toString'), m('valueOf'), m('hasOwnProperty'),
      m('push'), m('pop'), m('map'), m('filter'), m('reduce'),
      m('slice'), m('splice'), m('includes'), m('indexOf'),
      m('split'), m('join'), m('trim'), m('toUpperCase'), m('toLowerCase'),
      m('replace'), m('match'), m('charAt'), m('substring'),
    ];
  }

  const prefix = text.slice(0, offset).split(/[^A-Za-z0-9_$]/).pop() ?? '';

  const locals = collectSymbols(document)
    .filter((s) => s.name.startsWith(prefix) && s.name !== prefix)
    .map((s): CompletionItem => ({
      label: s.name,
      kind: s.kind === 'function' ? CompletionItemKind.Function
        : s.kind === 'class' ? CompletionItemKind.Class
        : CompletionItemKind.Variable,
      detail: s.kind,
    }));

  const keywords = KEYWORD_ITEMS.filter((k) => k.label.startsWith(prefix));
  const globals = GLOBAL_ITEMS.filter((g) => g.label.startsWith(prefix));

  return [...locals, ...keywords, ...globals];
}

// ===============================================================
//  DOCUMENT SYMBOLS
// ===============================================================

function provideDocumentSymbols(document: TextDocument): DocumentSymbol[] {
  return collectSymbols(document).map((s) => {
    const range = Range.create(s.line, s.col, s.line, s.col + s.name.length);
    return {
      name: s.name,
      kind: s.kind === 'function' ? SymbolKind.Function
        : s.kind === 'class' ? SymbolKind.Class
        : SymbolKind.Variable,
      range,
      selectionRange: range,
    };
  });
}

// ===============================================================
//  WIRING
// ===============================================================

connection.onInitialize((_params: InitializeParams): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {
      triggerCharacters: ['.', ' '],
      resolveProvider: false,
    },
    documentSymbolProvider: true,
  },
}));

documents.onDidChangeContent((change) => {
  connection.sendDiagnostics({
    uri: change.document.uri,
    diagnostics: validate(change.document),
  });
});

connection.onCompletion((params) => {
  const doc = documents.get(params.textDocument.uri);
  return doc ? provideCompletions(doc, params.position) : [];
});

connection.onDocumentSymbol((params) => {
  const doc = documents.get(params.textDocument.uri);
  return doc ? provideDocumentSymbols(doc) : [];
});

documents.listen(connection);
connection.listen();