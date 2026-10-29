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
repository is public. Otherwise, check the repository out inside the host repo and
use `subrepo(name = "js", path = "<checkout>", plugin = True)`.

## Rules

| Rule | Does |
|---|---|
| `pnpm_lock` | Creates `///<pkg>/<name>_store`, with one target per package version that downloads it and checks its sha512. Also creates one node_modules subrepo per importer, registered with `package_root` set to the importer's directory, so its outputs appear at `<importer>/node_modules/...` in a consumer's sandbox. Each has a public target per direct dependency, plus `:everything`. |
| `node_genrule` | A genrule run from the package directory, with the configured node as `$NODE`. |
| `vite_build` | Runs `vite build` with node_modules supplied by deps. |

## Config

| Key | Default | Meaning |
|---|---|---|
| `NodeTool` | `//third_party/node:node\|node` | The node binary, sha256-pinned per host platform |
| `GeneratorTools` | `//tools:tools` | The TypeScript generators, run by node's type stripping |
| `NpmRegistry` | `https://registry.npmjs.org` | Used when the lockfile names no tarball URL |

## How node_modules is built

- **Hoisted, like npm.** A package nests under its parent only on a version
  conflict. Nested packages are copied into their top-level owner, so no target's
  output sits inside another's: Please replaces a directory output wholesale when
  it writes it.
- **Workspace packages (`link:`)** are symlinks to their directories, as pnpm makes
  them, so their files resolve imports from their own importer's node_modules.
- **sha512 is checked by the unpack step.** `remote_file` verifies only sha1,
  sha256 or blake3.
- **Platform packages** (esbuild, rollup) are filtered by the host OS and CPU.
  Please has no separate execution platform.
