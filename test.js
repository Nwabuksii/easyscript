#!/usr/bin/env node
// esx <script.ej|script.et> [args]  -- compiles easyScript on load, then runs it as an ES module.
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extname, relative, resolve } from 'node:path';
import { compile, EasyError } from './compiler.js';

// hide Node's one-line experimental notice for type stripping, keep every other warning
const warn = process.emitWarning;
process.emitWarning = (w, ...a) => /stripTypeScriptTypes/.test(w) || warn.call(process, w, ...a);

const [file, ...args] = process.argv.slice(2);
if (!file || !/\.e[jt]$/.test(file)) {
  console.error('usage: esx <script.ej | script.et> [args...]');
  process.exit(2);
}

registerHooks({
  load(url, ctx, next) {
    const ext = extname(url);
    if (ext !== '.ej' && ext !== '.et') return next(url, ctx);
    const path = fileURLToPath(url);
    let source = compile(readFileSync(path, 'utf8'), relative(process.cwd(), path));
    // ponytail: .et only strips types (no type checking); run `tsc --noEmit` on emitted code if you need it
    if (ext === '.et') source = stripTypeScriptTypes(source, { mode: 'transform' });
    return { format: 'module', source, shortCircuit: true };
  },
});

const path = resolve(file);
process.argv = [process.argv[0], path, ...args];
try {
  await import(pathToFileURL(path).href);
} catch (e) {
  if (!(e instanceof EasyError)) throw e;
  console.error(e.message);
  process.exit(1);
}