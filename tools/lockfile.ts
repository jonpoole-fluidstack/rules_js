// Reads a pnpm v9 lockfile into the two views the generators need: the packages to
// download, and the dependency graph between peer-resolved snapshots.
import { readFileSync } from "node:fs";
import yaml from "./js-yaml.mjs";

export interface Resolution {
  integrity?: string;
  tarball?: string;
}

export interface PackageInfo {
  resolution: Resolution;
  os?: string[];
  cpu?: string[];
  libc?: string[];
}

export interface Snapshot {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface Importer {
  dependencies?: Record<string, { version: string }>;
  devDependencies?: Record<string, { version: string }>;
  optionalDependencies?: Record<string, { version: string }>;
}

export interface Lockfile {
  importers: Record<string, Importer>;
  packages: Record<string, PackageInfo>;
  snapshots: Record<string, Snapshot>;
}

export function readLockfile(path: string): Lockfile {
  const lock = yaml.load(readFileSync(path, "utf8")) as Lockfile & { lockfileVersion: string };
  if (!String(lock.lockfileVersion).startsWith("9")) {
    throw new Error(`unsupported lockfile version ${lock.lockfileVersion} in ${path}`);
  }
  return { importers: lock.importers ?? {}, packages: lock.packages ?? {}, snapshots: lock.snapshots ?? {} };
}

/** Splits `@scope/name@1.2.3(peer@4.5.6)` into its name and peer-free version. */
export function splitKey(key: string): { name: string; version: string } {
  const at = key.indexOf("@", 1);
  return { name: key.slice(0, at), version: key.slice(at + 1).split("(")[0] };
}

/** The snapshot key a dependency entry points at, or undefined for workspace links. */
export function snapshotKey(depName: string, ref: string): string | undefined {
  if (ref.startsWith("link:") || ref.startsWith("file:")) {
    return undefined;
  }
  // An aliased dependency (`string-width-cjs: string-width@4.2.3`) names its real package.
  return /^\d/.test(ref) ? `${depName}@${ref}` : ref;
}

/** The package key (no peer suffix) holding a snapshot's download and platform fields. */
export function packageKey(snapKey: string): string {
  const { name, version } = splitKey(snapKey);
  return `${name}@${version}`;
}

export function args(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}
