#!/usr/bin/env bun
// esx <script.ej|script.et> [args] -- compiles easyScript and runs it.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile, EasyError } from './compiler.js';
import pkg from './package.json';

const VERSION = pkg.version;
// Change this to your real repo URL before you publish.
const REPO_URL = 'https://github.com/yourname/easyscript';

const HELP = `
easyScript (esx) v${VERSION}

USAGE
  esx <script.ej | script.et> [args...]
  esx -v | --version
  esx -h | --help

KEYWORD CHANGES
  const        ->  fixed
  let          ->  make
  var          ->  mutable
  if           ->  when
  else if      ->  othen
  else         ->  ifnot
  switch       ->  match
  case         ->  option
  default      ->  other
  for          ->  runtill
  while        ->  keeprun
  do           ->  exec
  break        ->  stop
  continue     ->  skip
  function     ->  block
  return       ->  send
  async        ->  pending
  await        ->  waitfor
  import       ->  bring
  export       ->  give
  class        ->  bprint
  interface    ->  contract
  extends      ->  inherits
  implements   ->  follows
  constructor  ->  setup
  this         ->  self
  ===          ->  is
  !==          ->  isnot
  &&           ->  and
  ||           ->  or

Full documentation: ${REPO_URL}#readme
`.trimStart();

const [arg, ...args] = process.argv.slice(2);

if (arg === '-v' || arg === '--version') {
  console.log(VERSION);
  process.exit(0);
}

if (arg === '-h' || arg === '--help' || arg === '-help' || arg === 'help') {
  console.log(HELP);
  process.exit(0);
}

if (!arg || !/\.e[jt]$/.test(arg)) {
  console.error('usage: esx <script.ej | script.et> [args...]  (try: esx --help)');
  process.exit(2);
}

const file = arg;

// Extensions to try, in order, when resolving an extensionless relative import.
const RESOLVE_EXT = ['.ej', '.et', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
// Index files to try when a path resolves to a directory.
const INDEX_FILES = RESOLVE_EXT.map((e) => 'index' + e);

/** Return the first existing file from a list of candidate paths, or null. */
function firstFile(candidates) {
  for (const p of candidates) {
    try {
      if (existsSync(p) && statSync(p).isFile()) return p;
    } catch {}
  }
  return null;
}

/** Resolve an extensionless relative import against the importer's directory. */
function resolveRelative(spec, importer) {
  const base = resolve(dirname(importer), spec);

  // 1. Exact path (already has an extension, or the file has no extension at all)
  const exact = firstFile([base]);
  if (exact) return exact;

  // 2. Try each known extension
  const withExt = firstFile(RESOLVE_EXT.map((e) => base + e));
  if (withExt) return withExt;

  // 3. Try index files inside the directory
  const asIndex = firstFile(INDEX_FILES.map((f) => resolve(base, f)));
  if (asIndex) return asIndex;

  // 4. Give up; let Bun's default resolver handle it (npm packages, etc.)
  return null;
}

// 1. Register the easyScript loader plugin BEFORE any imports.
Bun.plugin({
  name: 'easyscript',
  setup(build) {
    // --- onResolve: rewrite extensionless relative specifiers to real files ---
    // Only handle specifiers that start with "./" or "../" and do NOT already
    // end in one of our known extensions. Absolute paths, bare specifiers
    // (npm packages), and "node:*" URLs are left to Bun's default resolver.
    build.onResolve({ filter: /^\.\.?\// }, (args) => {
      // Already an easyScript extension: let onLoad handle it directly.
      if (/\.e[jt]$/.test(args.path)) {
        return { path: resolve(dirname(args.importer), args.path) };
      }

      // Let Bun resolve anything that already looks fully qualified.
      if (/\.[cm]?[jt]sx?$/.test(args.path) || /\.json$/.test(args.path)) {
        return undefined;
      }

      // Extensionless (or unknown extension): try our own lookup first.
      const resolved = resolveRelative(args.path, args.importer);
      if (resolved) return { path: resolved };

      // Fall through to Bun's default resolver (bare specifiers, node:, etc.)
      return undefined;
    });

    // --- onLoad: compile .ej / .et files on demand ---
    build.onLoad({ filter: /\.e[jt]$/ }, (args) => {
      const src = readFileSync(args.path, 'utf8');
      const compiled = compile(src, args.path);
      // .et -> TypeScript loader (Bun strips types natively)
      // .ej -> plain JavaScript loader
      return {
        contents: compiled,
        loader: args.path.endsWith('.et') ? 'ts' : 'js',
      };
    });
  },
});

// 2. Now import the entry point. The plugin intercepts it.
const path = resolve(file);
process.argv = [process.argv[0], path, ...args];

try {
  await import(pathToFileURL(path).href);
} catch (e) {
  if (e instanceof EasyError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}