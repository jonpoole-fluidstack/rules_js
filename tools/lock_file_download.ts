// Generates the npm store subrepo: one package per npm package version, holding a
// remote_file for its tarball and a genrule that checks the lockfile's integrity hash
// and unpacks it. Nothing is fetched here; Please fetches only what a build reaches.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { args, readLockfile, splitKey } from "./lockfile.ts";

const opts = args(process.argv.slice(2));
const lock = readLockfile(opts.lock);
const registry = opts.registry.replace(/\/$/, "");

// remote_file only verifies sha1, sha256 or blake3, and pnpm records sha512, so the
// unpack step checks the hash itself before it trusts the tarball.
const unpack = [
  'got="sha512-$(openssl dgst -sha512 -binary "$SRCS" | openssl base64 -A)"',
  'if [ "$got" != "$INTEGRITY" ]; then echo "integrity mismatch for $SRCS: got $got, want $INTEGRITY" >&2; exit 1; fi',
  "mkdir $OUT",
  'tar -xzf "$SRCS" -C "$OUT" --strip-components=1',
  // Some packages publish directories without the execute bit, which makes them unreadable.
  'chmod -R u+rwX "$OUT"',
].join(" && ");

let count = 0;
for (const [key, info] of Object.entries(lock.packages)) {
  const { name, version } = splitKey(key);
  const integrity = info.resolution.integrity;
  if (!integrity && !info.resolution.tarball) {
    throw new Error(`${key} has neither an integrity hash nor a tarball URL`);
  }
  if (integrity && !integrity.startsWith("sha512-")) {
    throw new Error(`${key} has a ${integrity.split("-")[0]} integrity hash; only sha512 is supported`);
  }
  const basename = name.split("/").pop()!;
  const url = info.resolution.tarball ?? `${registry}/${name}/-/${basename}-${version}.tgz`;
  const dir = join(opts.out, "pkgs", name, version);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "BUILD"),
    `remote_file(
    name = "tgz",
    url = ${JSON.stringify(url)},
    out = "package.tgz",
)

genrule(
    name = ${JSON.stringify(basename)},
    srcs = [":tgz"],
    outs = [${JSON.stringify(basename)}],
    env = {"INTEGRITY": ${JSON.stringify(integrity ?? "")}},
    cmd = ${JSON.stringify(unpack)},
    visibility = ["PUBLIC"],
)
`,
  );
  count++;
}
writeFileSync(join(opts.out, "BUILD"), "");
console.error(`lock_file_download: ${count} packages`);
