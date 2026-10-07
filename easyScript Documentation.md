# easyScript Documentation

**easyScript** is a human-readable language built on JavaScript and TypeScript. It replaces cryptic keywords with plain words and keeps full access to the Node.js ecosystem.

| Language | Extension | Transpiles to | React variant |
| --- | --- | --- | --- |
| easyJavaScript | `.ej` | JavaScript | `.ejx` |
| easyTypeScript | `.et` | TypeScript | `.etx` |

---

## File extensions

| Extension | Meaning |
| --- | --- |
| `.ej` | easyJavaScript — plain easyScript, runs as JavaScript |
| `.et` | easyTypeScript — easyScript with TypeScript types, types are stripped before running |
| `.ejx` | **Reserved for React** — easyJavaScript with JSX |
| `.etx` | **Reserved for React** — easyTypeScript with TSX |

`.ej` and `.et` are the core language and are what the `esx` runner handles.
`.ejx` and `.etx` are owned by the React toolchain and are **not** processed by `esx`,
so the two can coexist in the same project without stepping on each other.

---

## Keywords changed from the first draft

| Standard JS / TS | Old easyScript | New easyScript | Why |
| --- | --- | --- | --- |
| `const` | `set` | **`fixed`** | `set` clashes with class setters (`set value(v) {}`) |
| `return` | `yield` | **`send`** | Frees the real `yield` for generators |
| `yield` | (was `return`) | *unchanged* | Generators work as in JS |
| `default` | (unmapped) | **`other`** | Matches the renamed `case` / `match` |

---

## Full keyword reference

### Variables and flow control

| Standard | easyScript | Description |
| --- | --- | --- |
| `const` | `fixed` | Constant declaration |
| `let` | `make` | Block-scoped variable |
| `var` | `mutable` | Function-scoped variable |
| `if` | `when` | Conditional |
| `else if` | `othen` | Secondary branch |
| `else` | `ifnot` | Fallback branch |
| `switch` | `match` | Multi-way evaluation |
| `case` | `option` | Match case |
| `default` | `other` | Match fallback |

### Loops and functions

| Standard | easyScript | Description |
| --- | --- | --- |
| `for` | `runtill` | Iteration loop |
| `while` | `keeprun` | Conditional loop |
| `do` | `exec` | Do-while prefix |
| `break` | `stop` | End loop |
| `continue` | `skip` | Next iteration |
| `function` | `block` | Function declaration |
| `return` | `send` | Return a value |

### Async and modules

| Standard | easyScript | Description |
| --- | --- | --- |
| `async` | `pending` | Async function |
| `await` | `waitfor` | Wait for a Promise |
| `import` | `bring` | Import a module |
| `export` | `give` | Export a member |

### Classes

| Standard | easyScript | Description |
| --- | --- | --- |
| `class` | `bprint` | Class (blueprint) |
| `interface` | `contract` | Interface (`.et`) |
| `extends` | `inherits` | Inheritance |
| `implements` | `follows` | Implement an interface |
| `constructor` | `setup` | Initialiser |
| `this` | `self` | Instance reference |

### Operators

| Standard | easyScript | Description |
| --- | --- | --- |
| `===` | `is` | Strict equality |
| `!==` | `isnot` | Strict inequality |
| `&&` | `and` | Logical AND |
| `\|\|` | `or` | Logical OR |

---

## Rules

1. **Unmapped keywords stay unchanged.** `try`, `catch`, `finally`, `throw`, `new`, `typeof`, `instanceof`, `in`, `of`, `delete`, `void`, `super`, `static`, `yield`, `true`, `false`, `null`, `undefined`, and TypeScript words such as `type`, `enum`, `public`, `private` work exactly as in JS/TS.
2. **Keyword position.** A word is treated as a keyword only when it is not preceded by `.` or `?.` and is not an object key (followed by `:`). So `text.match(/x/)` and `{ stop: 1 }` are left alone.
3. **Reserved operators.** `is`, `isnot`, `and`, `or` are always reserved and cannot be used as names.
4. **Strict enforcement.** Standard keywords used as keywords are compile errors. They are still fine as plain names (a variable called `let`, a property `obj.let`).
5. **Strings, comments, template literals and regex literals are never rewritten.**
6. **Errors report the original file position**, not the transpiled output.

```text
[Easy Compile Error] app.ej:1:1
  Standard keyword 'let' is not allowed. Use 'make' instead.
  1 | let total = 100;