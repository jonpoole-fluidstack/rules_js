# rules_js (Please plugin, prototype)

A proof of concept: Please rules that build JavaScript from a pnpm lockfile
hermetically, in the style of Aspect's rules_js for Bazel. Nothing runs
`pnpm install`. Every npm package is a target, checked against the lockfile's
hash, and `node_modules` is assembled inside each action's sandbox.

## Use

```ini
# .plzconfig
[Plugin "js"]
Target = //plugins:js

[Parse]
PreloadSubincludes = ///js//build_defs:js
```

```python
# plugins/BUILD
plugin_repo(name = "js", plugin = "rules_js", owner = "jonpoole-fluidstack", revision = "<sha>")
```

```python
# app/BUILD
pnpm_lock(name = "npm", lockfile = "pnpm-lock.yaml", importers = [".", "packages/ui"])

vite_build(
    name = "dist",
    srcs = glob(["src/**", "index.html", "vite.config.ts", "package.json"]),
    deps = ["///app/npm//:everything"],
)
```

`plugin_repo` downloads a GitHub archive anonymously, so it works only while this
repository is public.

To build against a local checkout while changing the rules, build the plugin
subrepo from the checkout's files. `system_srcs` accepts absolute paths; `srcs`
does not.

```python
build_rule(
    name = "js",
    system_srcs = [f"{CONFIG.RULES_JS_CHECKOUT}/{f}" for f in [".plzconfig", "build_defs", "third_party", "tools"]],
    outs = ["js"],
    cmd = 'mkdir "$OUT" && cp -R $SRCS "$OUT"/',
    _subrepo = True,
)
subrepo(name = "js", dep = ":js", plugin = True)
```

## Rules

| Rule | Does |
|---|---|
| `node_toolchain` | Downloads a node distribution (by `version`, or `url`) for the build's platform and outputs only its `bin/node`. Point `NodeTool` at it to use your own. |
| `pnpm_lock` | Creates `///<pkg>/<name>_store`, with one target per package version that downloads it and checks its sha512. Also creates `///<pkg>/<name>`, which lays out every importer's node_modules over one shared store. It's registered with `package_root` set to the lockfile's directory, so its outputs appear at `<importer>/node_modules/...` in a consumer's sandbox. Each importer's package in it has a public target per direct dependency, plus `:everything`. |
| `js_library` | Sources plus the libraries and npm packages they import. Builds see the closure through `exported_deps`, tests through `runtime_deps`, like Bazel's runfiles. |
| `node_genrule` | A genrule run from the package directory, with the configured node as `$NODE`. |
| `vite_build` | Runs `vite build` with node_modules supplied by deps. |
| `vitest_test` | Runs one folder's vitest suites from the workspace root (`--dir=<folder>`), writing the JUnit report to Please's results file. |

## Config

| Key | Default | Meaning |
|---|---|---|
| `NodeTool` | `//third_party/node` | The node executable: this repo's `node_toolchain` (22.17.0), unless you declare your own |
| `GeneratorTools` | `//tools:tools` | The TypeScript generators, run by node's type stripping |
| `NpmRegistry` | `https://registry.npmjs.org` | Used when the lockfile names no tarball URL |

## How node_modules is built

- **pnpm's layout.** Each lockfile snapshot (a version with its peers resolved)
  gets its own `node_modules/_store/<snapshot>/node_modules/<pkg>`, with its
  dependencies as sibling symlinks. `node_modules/<dep>` is a symlink into the store.
  - A package and its peers resolve to one instance. A hoisted, copied layout broke
    orval: ajv-errors and the ajv it extends ended up as two copies.
  - No target's output sits inside another's. Please replaces a directory output
    wholesale when it writes it.
- **Hidden hoisting.** `node_modules/_store/node_modules/<pkg>` links one version of
  every package, as pnpm's `.pnpm/node_modules` does, so a package that imports
  something it doesn't declare (tiptap-markdown imports `@tiptap/pm`) still
  resolves. A direct dependency's target carries these links only for its own
  closure; `:everything` carries all of them.
- **Workspace packages (`link:`)** are symlinks to their directories, as pnpm makes
  them, so their files resolve imports from their own importer's node_modules.
- **sha512 is checked by the unpack step.** `remote_file` verifies only sha1,
  sha256 or blake3.
- **Platform packages** (esbuild, rollup) are filtered by the host OS and CPU.
  Please has no separate execution platform.
