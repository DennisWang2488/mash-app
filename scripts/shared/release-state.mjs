import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { compareVersions } from "./updater-manifest.mjs";

const manifestPath = "src-tauri/resources/runtime-manifest.json";
const read = file => fs.readFileSync(file, "utf8");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const git = (...args) => execFileSync("git", args, { encoding: "utf8", windowsHide: true }).trim();
export function validateVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Version must look like x.y.z: ${version}`);
}
function replaceValue(text, section, key, value) {
  const pattern = new RegExp(`(\\[${section}\\][\\s\\S]*?\\n${key}\\s*=\\s*")[^"]+(")`);
  if (!pattern.test(text)) throw new Error(`Missing ${section}.${key}`);
  return text.replace(pattern, (_, prefix, suffix) => `${prefix}${value}${suffix}`);
}
export function readVersions() {
  const source = read("versions.toml");
  const value = (section, key) => {
    const match = source.match(new RegExp(`\\[${section}\\][\\s\\S]*?\\n${key}\\s*=\\s*"([^"]+)"`));
    if (!match) throw new Error(`Missing ${section}.${key}`);
    return match[1];
  };
  return { app: value("app", "version"), code: value("mash_cv", "code"), runtime: value("mash_cv", "runtime") };
}
export function updateVersion(kind, version) {
  validateVersion(version);
  if (!["app", "code", "runtime"].includes(kind)) throw new Error(`Unknown version kind: ${kind}`);
  const updates = new Map([["versions.toml", replaceValue(read("versions.toml"), kind === "app" ? "app" : "mash_cv", kind === "app" ? "version" : kind, version)]]);
  if (kind === "app") {
    const config = JSON.parse(read("src-tauri/tauri.conf.json"));
    config.version = version;
    updates.set("src-tauri/tauri.conf.json", `${JSON.stringify(config, null, 2)}\n`);
    updates.set("src-tauri/Cargo.toml", replaceValue(read("src-tauri/Cargo.toml"), "package", "version", version));
    const lock = read("src-tauri/Cargo.lock");
    const pattern = /(\[\[package\]\]\r?\nname = "mash"\r?\nversion = ")[^"]+(")/;
    if (!pattern.test(lock)) throw new Error("Missing mash package in Cargo.lock");
    updates.set("src-tauri/Cargo.lock", lock.replace(pattern, (_, prefix, suffix) => `${prefix}${version}${suffix}`));
  }
  for (const [file, text] of updates) fs.writeFileSync(file, text);
}
export function applyCvArtifact(kind, version, platform, url, sha256) {
  validateVersion(version);
  if (!["runtime", "code"].includes(kind)) throw new Error("Invalid CV artifact kind");
  if (!/^(windows|darwin)-(x86_64|aarch64)$/.test(platform)) throw new Error("Invalid platform");
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid SHA-256");
  if (new URL(url).protocol !== "https:") throw new Error("Artifact URL must use HTTPS");
  const manifest = JSON.parse(read(manifestPath));
  manifest[kind === "code" ? "mashCvCodeVersion" : "mashCvRuntimeVersion"] = version;
  manifest.platforms ??= {};
  manifest.platforms[platform] ??= {};
  manifest.platforms[platform][`${kind}Url`] = url;
  manifest.platforms[platform][`${kind}Sha256`] = sha256;
  writeJson(manifestPath, manifest);
}
export function finalizeChangelog(version, date) {
  validateVersion(version);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid release date");
  const original = read("CHANGELOG.md");
  if (!/^## 未发布\r?$/m.test(original)) throw new Error("Missing unreleased changelog heading");
  fs.writeFileSync("CHANGELOG.md", original.replace(/^## 未发布\r?$/m, `## v${version} - ${date}`));
}
export const runtimePaths = ["sidecar/mash_cv/pyproject.toml", "sidecar/mash_cv/poetry.lock",
  "sidecar/mash_cv/build_sidecar.py", "scripts/macos/build-cv.sh", "scripts/windows/build-cv.ps1",
  "src-tauri/resources/scrcpy"];
export function hasChangesSince(ref, paths) {
  return Boolean(ref && git("diff", "--name-only", `${ref}..HEAD`, "--", ...paths));
}
export function releasePlan(app, code, runtime, platform, publish = false) {
  validateVersion(app);
  if (code) validateVersion(code);
  if (runtime) validateVersion(runtime);
  if (!/^windows-(x86_64|aarch64)$/.test(platform)) throw new Error("Unsupported Windows platform");
  const current = readVersions();
  const latestTag = pattern => git("for-each-ref", "--count=1", "--sort=-version:refname", "--format=%(refname:strip=2)", `refs/tags/${pattern}`);
  const appTag = `v${app}`;
  if (compareVersions(app, current.app) < 0) throw new Error("App version cannot go backwards");
  const sameVersion = app === current.app;
  if (sameVersion && !git("tag", "--points-at", "HEAD", "--list", appTag)) throw new Error(`Current app version requires HEAD at ${appTag}`);
  if (sameVersion && (code || runtime)) throw new Error("Changing CV packages requires a new app version");
  const tags = [!sameVersion && appTag, code && `cv-code/${code}`, runtime && `cv-runtime/${platform}/${runtime}`].filter(Boolean);
  for (const tag of tags) {
    if (git("tag", "--list", tag)) throw new Error(`Tag already exists: ${tag}`);
  }
  for (const [kind, target] of [["code", code], ["runtime", runtime]]) {
    if (target && /^\d+\.\d+\.\d+$/.test(current[kind]) && compareVersions(target, current[kind]) <= 0) throw new Error(`CV ${kind} version must increase`);
  }
  const changelog = read("CHANGELOG.md");
  const ready = new RegExp(`^## v${app.replaceAll(".", "\\.")} - \\d{4}-\\d{2}-\\d{2}\\r?$`, "m").test(changelog);
  const unreleased = /^## 未发布\r?$/m.test(changelog);
  if (!ready && !unreleased) throw new Error("Missing target release or unreleased changelog heading");
  const lastCode = latestTag("cv-code/*");
  const base = git("log", "-1", "--format=%H", "-S", `runtime = "${current.runtime}"`, "--", "versions.toml") || latestTag("v*");
  const codeChanged = hasChangesSince(lastCode, ["sidecar/mash_cv/mash_cv", "sidecar/mash_cv/tests", "src-tauri/resources/servers"]);
  const runtimeChanged = hasChangesSince(base, runtimePaths);
  // A second platform publishes the exact same tagged source without new CV releases.
  if (publish && !sameVersion) {
    if (codeChanged && !code) throw new Error("CV code changes detected; pass -CvCode <version>");
    if (runtimeChanged && !runtime) throw new Error("CV runtime changes detected; pass -CvRuntime <version>");
  }
  return { current, app, code, runtime, platform, tags, sameVersion, changelog: ready ? "ready" : "unreleased", codeChanged, runtimeChanged };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "versions": console.log(JSON.stringify(readVersions())); break;
    case "version": updateVersion(...args); break;
    case "artifact": applyCvArtifact(...args); break;
    case "changelog": finalizeChangelog(...args); break;
    case "plan": console.log(JSON.stringify(releasePlan(args[0], args[1] === "-" ? "" : args[1], args[2] === "-" ? "" : args[2], args[3], args[4] === "publish"))); break;
    default: throw new Error(`Unknown release command: ${command}`);
  }
}
