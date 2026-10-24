import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

export function normalizeInstallPath(installRoot) {
  const resolved = fs.realpathSync.native(path.resolve(installRoot));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/** Each installation and application build owns its own record and originals. */
export function patchStatePaths({ installRoot, dataFolderName, commit, version, home = os.homedir() }) {
  const normalized = normalizeInstallPath(installRoot);
  const root = path.join(home, dataFolderName || '.kiro', 'kiro-language-pack');
  const installDir = path.join(root, 'installs', sha256(normalized));
  const buildDir = path.join(installDir, 'builds', sha256(JSON.stringify([commit ?? null, version ?? null])));
  return {
    installRoot: normalized,
    root,
    installDir,
    buildDir,
    backupRoot: path.join(buildDir, 'backup'),
    recordPath: path.join(buildDir, 'patch.json'),
    reportDir: path.join(buildDir, 'reports'),
    lockPath: path.join(installDir, 'patch.lock')
  };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`Cannot read patch state ${file}: ${err.message}`);
  }
}

function within(root, rel) {
  const file = path.resolve(root, rel);
  const tail = path.relative(root, file);
  if (!tail || tail === '..' || tail.startsWith(`..${path.sep}`) || path.isAbsolute(tail)) {
    throw new Error(`Patch path escapes its directory: ${rel}`);
  }
  return file;
}

function currentHash(file) {
  try {
    if (!fs.lstatSync(file).isFile()) throw new Error(`Not a regular file: ${file}`);
    return sha256(fs.readFileSync(file));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** Write beside the destination, flush, check its contents again, then replace it. */
export function atomicWrite(file, data, { expectedHash, mode = 0o600 } = {}) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx', mode);
    fs.writeFileSync(fd, data);
    // open() applies umask; an existing application's permissions must survive.
    fs.fchmodSync(fd, mode);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    if (expectedHash !== undefined && currentHash(file) !== expectedHash) {
      throw new Error(`File changed outside the patch; left untouched: ${file}`);
    }
    fs.renameSync(temporary, file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    fs.rmSync(temporary, { force: true });
  }
}

export function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  atomicWrite(file, JSON.stringify(data, null, 2) + '\n');
}

/**
 * The journal permits only an original, the last patch, or either side of a pending
 * write. Originals never change within a build. No rollback writes old bytes over
 * a third party's edits, and backups are retained even after a successful restore.
 */
export class PatchState {
  constructor({ targetRoot, legacyRecordPath, legacyBackupRoot, legacyVersionField = 'kiroVersion', ...identity }) {
    this.paths = patchStatePaths(identity);
    this.identity = {
      schemaVersion: 2,
      installRoot: this.paths.installRoot,
      version: identity.version ?? null,
      commit: identity.commit ?? null
    };
    this.targetRoot = targetRoot;
    this.legacyRecordPath = legacyRecordPath;
    this.legacyBackupRoot = legacyBackupRoot;
    this.legacyVersionField = legacyVersionField;
    this.snapshots = new Map();
    this.outputs = new Map();
    this.load();
  }

  load() {
    let record = readJson(this.paths.recordPath);
    if (record) {
      if (record.schemaVersion !== 2 || record.installRoot !== this.identity.installRoot
          || record.commit !== this.identity.commit || record.version !== this.identity.version) {
        throw new Error(`Patch record belongs to another installation/build: ${this.paths.recordPath}`);
      }
    } else if (this.legacyRecordPath) {
      const legacy = readJson(this.legacyRecordPath);
      if (legacy && legacy[this.legacyVersionField] === this.identity.version
          && (!legacy.commit || legacy.commit === this.identity.commit)) {
        record = {
          ...legacy,
          ...this.identity,
          legacy: { recordPath: this.legacyRecordPath, backupRoot: this.legacyBackupRoot }
        };
      }
    }
    if (record) {
      if (!record.files || typeof record.files !== 'object' || Array.isArray(record.files)) {
        throw new Error('Patch record has no valid file list; keep it for recovery.');
      }
      for (const [rel, entry] of Object.entries(record.files)) {
        within(this.targetRoot, rel);
        for (const hash of [entry.original, entry.patched, entry.pending?.before, entry.pending?.after]) {
          if (hash !== undefined && !/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid patch hash for ${rel}`);
        }
        if (!entry.original || !entry.patched) throw new Error(`Incomplete patch entry for ${rel}`);
        entry.backup = `backup/${entry.original}`;
      }
    }
    this.record = record;
  }

  /** Serialize writers for this install, including writers targeting different builds. */
  lock() {
    fs.mkdirSync(this.paths.installDir, { recursive: true });
    const token = crypto.randomUUID();
    const owner = { pid: process.pid, token };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        fs.writeFileSync(this.paths.lockPath, JSON.stringify(owner), { flag: 'wx', mode: 0o600 });
        break;
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
        let other;
        try { other = readJson(this.paths.lockPath); } catch { /* An interrupted lock write. */ }
        let alive = true;
        if (Number.isInteger(other?.pid) && other.pid > 0) {
          try { process.kill(other.pid, 0); } catch (probe) { if (probe.code === 'ESRCH') alive = false; }
        } else {
          alive = Date.now() - fs.statSync(this.paths.lockPath).mtimeMs < 30000;
        }
        if (alive || attempt) throw new Error(`Another patch may be running. Retry after it exits: ${this.paths.lockPath}`);
        fs.rmSync(this.paths.lockPath);
      }
    }
    const release = () => {
      try {
        if (readJson(this.paths.lockPath)?.token === token) fs.rmSync(this.paths.lockPath, { force: true });
      } catch { /* Preserve an unreadable lock instead of removing someone else's. */ }
    };
    process.once('exit', release);
    this.load();
    return () => { release(); process.removeListener('exit', release); };
  }

  relative(file) {
    const rel = path.relative(this.targetRoot, file).split(path.sep).join('/');
    within(this.targetRoot, rel);
    return rel;
  }

  allowed(entry, hash) {
    return hash !== null && [entry.original, entry.patched, entry.pending?.before, entry.pending?.after].includes(hash);
  }

  original(rel, entry) {
    const backup = path.join(this.paths.backupRoot, entry.original);
    let file = backup;
    // Legacy copies stay in place. A later retry can still import a repaired backup.
    if (!fs.existsSync(file) && this.record?.legacy) {
      if (this.record.legacy.backupRoot !== this.legacyBackupRoot) throw new Error('Unexpected legacy backup directory');
      file = within(this.legacyBackupRoot, rel);
    }
    if (!fs.existsSync(file)) throw new Error(`Backup missing for ${rel}: ${backup}`);
    const data = fs.readFileSync(file);
    if (sha256(data) !== entry.original) throw new Error(`Backup hash mismatch for ${rel}: ${file}`);
    return data;
  }

  source(file) {
    const rel = this.relative(file);
    if (!fs.lstatSync(file).isFile()) throw new Error(`Not a regular file: ${file}`);
    const before = fs.readFileSync(file);
    const current = sha256(before);
    const entry = this.record?.files[rel];
    if (entry && !this.allowed(entry, current)) throw new Error(`File changed outside the patch; left untouched: ${file}`);
    const original = entry ? this.original(rel, entry) : before;
    this.snapshots.set(rel, { file, before, current, original });
    return original.toString('utf8');
  }

  stage(file, text) {
    const rel = this.relative(file);
    const snapshot = this.snapshots.get(rel);
    if (!snapshot) throw new Error(`Patch source was not read: ${file}`);
    const after = Buffer.from(text, 'utf8');
    if (this.record?.files[rel] || !after.equals(snapshot.before)) {
      this.outputs.set(rel, { ...snapshot, after });
    }
  }

  keepOriginal(data, hash) {
    const file = path.join(this.paths.backupRoot, hash);
    if (fs.existsSync(file)) {
      if (sha256(fs.readFileSync(file)) !== hash) throw new Error(`Backup hash mismatch: ${file}`);
      return;
    }
    fs.mkdirSync(this.paths.backupRoot, { recursive: true });
    atomicWrite(file, data);
  }

  save(record) {
    writeJsonAtomic(this.paths.recordPath, record);
    this.record = record;
  }

  importLegacyBackups() {
    if (!this.record?.legacy) return;
    for (const [rel, entry] of Object.entries(this.record.files)) {
      try { this.keepOriginal(this.original(rel, entry), entry.original); }
      catch { /* Missing/corrupt backups remain recorded for recovery. */ }
    }
  }

  apply(metadata) {
    const files = structuredClone(this.record?.files ?? {});
    for (const [rel, item] of this.outputs) {
      if (currentHash(item.file) !== item.current) throw new Error(`File changed while planning: ${item.file}`);
      const original = sha256(item.original);
      this.keepOriginal(item.original, original);
      files[rel] = {
        original,
        patched: sha256(item.after),
        backup: `backup/${original}`,
        pending: { before: item.current, after: sha256(item.after) }
      };
    }
    this.importLegacyBackups();
    this.save({ ...this.record, ...this.identity, ...metadata, status: 'applying', files });
    for (const item of this.outputs.values()) {
      if (item.after.equals(item.before)) continue;
      atomicWrite(item.file, item.after, { expectedHash: item.current, mode: fs.statSync(item.file).mode & 0o777 });
    }
    const completed = structuredClone(files);
    for (const rel of this.outputs.keys()) delete completed[rel].pending;
    this.save({ ...this.record, status: 'patched', files: completed });
  }

  restore() {
    if (!this.record) return { restored: 0, problems: [] };
    const files = structuredClone(this.record.files);
    const candidates = [];
    const problems = [];
    for (const [rel, entry] of Object.entries(files)) {
      try {
        const original = this.original(rel, entry);
        const file = within(this.targetRoot, rel);
        const current = currentHash(file);
        if (!this.allowed(entry, current)) throw new Error('file changed outside the patch or is missing; left untouched');
        candidates.push({ rel, file, original, current });
        entry.pending = { before: current, after: entry.original };
      } catch (err) {
        problems.push(`${rel}: ${err.message}`);
      }
    }
    this.importLegacyBackups();
    this.save({ ...this.record, status: 'restoring', files });
    let restored = 0;
    for (const item of candidates) {
      try {
        if (item.current !== files[item.rel].original) {
          atomicWrite(item.file, item.original, { expectedHash: item.current, mode: fs.statSync(item.file).mode & 0o777 });
          restored++;
        }
        files[item.rel].patched = files[item.rel].original;
        delete files[item.rel].pending;
      } catch (err) {
        problems.push(`${item.rel}: ${err.message}`);
      }
    }
    this.save({ ...this.record, status: problems.length ? 'restore-incomplete' : 'restored', files });
    return { restored, problems };
  }
}
