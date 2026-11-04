# Design tokens

`tokens.json` is the source of truth, in [DTCG](https://www.designtokens.org/) format (`$type`/`$value`), with a `light` and a `dark` group holding the same semantic token names. `tokens.css` is a hand-maintained mirror of it as CSS custom properties — there is no Style Dictionary (or other) build script wired up yet to generate one from the other, so **update both files together** whenever a value changes. Wiring up that generation step is a follow-up task, not done here.

Both files were extracted from the merged UI reference at `design/note-detail/final-notula.html` on 2026-11-04 — that file's `:root`, `:root[data-theme="dark"]`, and `@media (prefers-color-scheme: dark)` blocks are the values' origin.
