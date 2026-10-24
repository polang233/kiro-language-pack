/** Pure snapshot comparison and translation review. No filesystem or app access. */
const IGNORED_MODULE = /(^|\/)tests?\//;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const coreOrder = (a, b) => compare(a.moduleId, b.moduleId) || compare(a.key, b.key);
const sourceText = (value) => typeof value === 'string' ? value : value?.message ?? '';
const recorded = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function flattenCore(core = {}) {
  const rows = [];
  for (const [moduleId, keys] of Object.entries(core)) {
    if (IGNORED_MODULE.test(moduleId)) continue;
    for (const [key, english] of Object.entries(keys ?? {})) {
      rows.push({ moduleId, key, english: sourceText(english) });
    }
  }
  return new Map(rows.sort(coreOrder).map((row) => [`${row.moduleId}\0${row.key}`, row]));
}

function diffRows(before, after) {
  const addedKeys = [], removedKeys = [], changedKeys = [];
  for (const [id, row] of after) {
    if (!before.has(id)) addedKeys.push({ ...row });
    else if (before.get(id).english !== row.english) {
      changedKeys.push({ ...row, previousEnglish: before.get(id).english });
    }
  }
  for (const [id, row] of before) {
    if (!after.has(id)) removedKeys.push({ ...row });
  }
  return { addedKeys, removedKeys, changedKeys };
}

function extensionRows(extensionId, entries = {}) {
  return new Map(Object.entries(entries ?? {}).sort(([a], [b]) => compare(a, b))
    .map(([key, value]) => [key, { extensionId, key, english: sourceText(value) }]));
}

const counts = (diff) => ({
  added: diff.addedKeys.length, removed: diff.removedKeys.length, changed: diff.changedKeys.length
});
const emptyDiff = () => ({ addedKeys: [], removedKeys: [], changedKeys: [] });

/** A move requires the same key and English unique in BOTH complete snapshots. */
function findMoves(before, after, added, removed) {
  const identity = (row) => row.english;
  const index = (rows) => {
    const map = new Map();
    for (const row of rows) {
      const id = identity(row);
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    }
    return map;
  };
  const beforeIndex = index(before.values()), afterIndex = index(after.values());
  const removedIndex = index(removed);
  return added.flatMap((row) => {
    const id = identity(row), candidates = removedIndex.get(id) ?? [];
    if (!row.english || candidates.length !== 1 ||
        beforeIndex.get(id)?.length !== 1 || afterIndex.get(id)?.length !== 1) return [];
    const old = candidates[0];
    if (old.moduleId === row.moduleId || old.key !== row.key) return [];
    return [{ fromModuleId: old.moduleId, toModuleId: row.moduleId, key: row.key, english: row.english }];
  });
}

export function diffUpgrade(before, after) {
  const beforeCore = flattenCore(before?.core), afterCore = flattenCore(after.core);
  const core = diffRows(beforeCore, afterCore);
  const movedKeys = findMoves(beforeCore, afterCore, core.addedKeys, core.removedKeys);
  const previous = before?.extensions ?? {}, current = after.extensions ?? {};
  const addedExtensions = [], removedExtensions = [];
  const packageNls = emptyDiff(), l10nBundle = emptyDiff();
  const comparedExtensions = [], uncomparedExtensions = [];
  const ids = [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort(compare);
  for (const extensionId of ids) {
    const old = previous[extensionId], next = current[extensionId];
    if (!old) addedExtensions.push(extensionId);
    if (!next) removedExtensions.push(extensionId);
    const packageDiff = diffRows(
      extensionRows(extensionId, old?.packageNls), extensionRows(extensionId, next?.packageNls)
    );
    for (const key of Object.keys(packageNls)) packageNls[key].push(...packageDiff[key]);

    // An absent extension is known empty; an omitted bundle field is NOT a baseline.
    const beforeKnown = !old || recorded(old.l10nBundle);
    const afterKnown = !next || recorded(next.l10nBundle);
    if (!beforeKnown || !afterKnown) {
      uncomparedExtensions.push({
        extensionId,
        reason: !beforeKnown && !afterKnown ? 'baseline-and-current-not-recorded'
          : !beforeKnown ? 'baseline-not-recorded' : 'current-not-recorded'
      });
      continue;
    }
    comparedExtensions.push(extensionId);
    const bundleDiff = diffRows(
      extensionRows(extensionId, old?.l10nBundle), extensionRows(extensionId, next?.l10nBundle)
    );
    for (const key of Object.keys(l10nBundle)) l10nBundle[key].push(...bundleDiff[key]);
  }
  return {
    baselineAvailable: before != null,
    ...core,
    movedKeys,
    counts: { ...counts(core), moved: movedKeys.length },
    extensionDrift: {
      addedExtensions, removedExtensions,
      counts: { addedExtensions: addedExtensions.length, removedExtensions: removedExtensions.length },
      packageNls: { ...packageNls, counts: counts(packageNls) },
      l10nBundle: {
        ...l10nBundle, counts: counts(l10nBundle), comparedExtensions, uncomparedExtensions,
        coverage: { comparedExtensions: comparedExtensions.length, uncomparedExtensions: uncomparedExtensions.length }
      }
    }
  };
}

function translationState(english, own, upstream) {
  const candidate = (value) => typeof value === 'string' && value !== '' ? value : null;
  const ownTranslation = candidate(own), upstreamTranslation = candidate(upstream);
  const effectiveSource = ownTranslation !== null ? 'own' : upstreamTranslation !== null ? 'upstream' : null;
  const effective = effectiveSource === 'own' ? ownTranslation : upstreamTranslation;
  return {
    own: ownTranslation, upstream: upstreamTranslation, effectiveSource,
    translated: effective !== null,
    identicalToEnglish: effective !== null && effective === english
  };
}

function review(english, own, upstream) {
  const { translated, ...state } = translationState(english, own, upstream);
  return {
    ...state, hasCandidateTranslation: translated, required: true,
    sourcesToReview: ['own', 'upstream'].filter((source) => state[source] !== null)
  };
}

/** Candidate translations for changed English always require review, even if present. */
export function auditUpgrade(metadata, drift, {
  ownCore = {}, authoredCore = ownCore, upstreamCore = {}, ownExtensions = {}, upstreamExtensions = {}
} = {}) {
  const live = flattenCore(metadata.core);
  const missingTranslations = [], identicalToEnglish = [];
  for (const row of live.values()) {
    const state = translationState(row.english, ownCore[row.moduleId]?.[row.key], upstreamCore[row.moduleId]?.[row.key]);
    if (row.english !== '' && !state.translated) missingTranslations.push(row);
    if (state.identicalToEnglish) identicalToEnglish.push({ ...row, translationSource: state.effectiveSource });
  }
  const missingIds = new Set(missingTranslations.map((row) => `${row.moduleId}\0${row.key}`));
  const addedUntranslated = drift.addedKeys.filter((row) => missingIds.has(`${row.moduleId}\0${row.key}`));
  const changedKeys = drift.changedKeys.map((row) => ({
    ...row, translationReview: review(row.english, ownCore[row.moduleId]?.[row.key], upstreamCore[row.moduleId]?.[row.key])
  }));
  const movedKeys = drift.movedKeys.map((row) => ({
    ...row,
    translationReview: review(row.english, ownCore[row.toModuleId]?.[row.key], upstreamCore[row.toModuleId]?.[row.key]),
    previousTranslations: translationState(row.english, ownCore[row.fromModuleId]?.[row.key], upstreamCore[row.fromModuleId]?.[row.key])
  }));
  const orphanedAuthored = [...flattenCore(authoredCore).entries()]
    .filter(([id]) => !live.has(id)).map(([, { moduleId, key }]) => ({ moduleId, key }));
  const removedIds = new Set(drift.removedKeys.map((row) => `${row.moduleId}\0${row.key}`));
  const newlyOrphanedAuthored = orphanedAuthored.filter((row) => removedIds.has(`${row.moduleId}\0${row.key}`));
  const preExistingOrphanedAuthored = drift.baselineAvailable
    ? orphanedAuthored.filter((row) => !removedIds.has(`${row.moduleId}\0${row.key}`)) : null;
  const missingModules = new Map();
  for (const { moduleId, key, english } of missingTranslations) {
    if (!missingModules.has(moduleId)) missingModules.set(moduleId, []);
    missingModules.get(moduleId).push({ key, english });
  }
  const missingByModule = Object.fromEntries([...missingModules]
    .sort((a, b) => b[1].length - a[1].length || compare(a[0], b[0])));

  const extensionMissingTranslations = [], extensionIdenticalToEnglish = [];
  for (const [extensionId, ext] of Object.entries(metadata.extensions ?? {}).sort(([a], [b]) => compare(a, b))) {
    for (const [section, translationSection] of [['packageNls', 'package'], ['l10nBundle', 'bundle']]) {
      for (const row of extensionRows(extensionId, ext[section]).values()) {
        const state = translationState(row.english,
          ownExtensions[extensionId]?.[translationSection]?.[row.key],
          upstreamExtensions[extensionId]?.[translationSection]?.[row.key]);
        if (row.english !== '' && !state.translated) {
          extensionMissingTranslations.push({ ...row, section });
        }
        if (state.identicalToEnglish) {
          extensionIdenticalToEnglish.push({ ...row, section, translationSource: state.effectiveSource });
        }
      }
    }
  }
  const extensionDrift = { ...drift.extensionDrift };
  for (const [section, translationSection] of [['packageNls', 'package'], ['l10nBundle', 'bundle']]) {
    const diff = drift.extensionDrift[section];
    extensionDrift[section] = { ...diff, changedKeys: diff.changedKeys.map((row) => ({
      ...row, translationReview: review(row.english,
        ownExtensions[row.extensionId]?.[translationSection]?.[row.key],
        upstreamExtensions[row.extensionId]?.[translationSection]?.[row.key])
    })) };
  }
  return {
    changedKeys, movedKeys, extensionDrift,
    missingTranslations, addedUntranslated, missingByModule, identicalToEnglish,
    orphanedAuthored, newlyOrphanedAuthored, preExistingOrphanedAuthored,
    extensionMissingTranslations, extensionIdenticalToEnglish
  };
}

/** English work list. Existing candidate translations never suppress changed sources. */
export function buildUpgradeSkeleton(audits) {
  const core = new Map(), extensions = new Map();
  const coreWork = new Map(), extensionWork = new Map();
  for (const audit of audits) {
    for (const row of [...audit.missingTranslations, ...audit.changedKeys]) {
      if (!core.has(row.moduleId)) core.set(row.moduleId, new Map());
      core.get(row.moduleId).set(row.key, row.english);
      const id = `${row.moduleId}\0${row.key}`;
      if (!coreWork.has(id) || row.translationReview?.required) {
        coreWork.set(id, { moduleId: row.moduleId, key: row.key,
          reason: row.translationReview?.required ? 'source-changed' : 'missing-translation' });
      }
    }
    const changed = ['packageNls', 'l10nBundle'].flatMap((section) =>
      audit.extensionDrift[section].changedKeys.map((row) => ({ ...row, section })));
    for (const row of [...audit.extensionMissingTranslations, ...changed]) {
      if (!extensions.has(row.extensionId)) extensions.set(row.extensionId, { package: new Map(), bundle: new Map() });
      const section = row.section === 'packageNls' ? 'package' : 'bundle';
      extensions.get(row.extensionId)[section].set(row.key, row.english);
      const id = `${row.extensionId}\0${row.section}\0${row.key}`;
      if (!extensionWork.has(id) || row.translationReview?.required) {
        extensionWork.set(id, { extensionId: row.extensionId, section: row.section, key: row.key,
          reason: row.translationReview?.required ? 'source-changed' : 'missing-translation' });
      }
    }
  }
  return {
    version: '1.0.0',
    $comment: 'English source work list. Entries in $reviewRequired need translation or source review before use in src/i18n/.',
    contents: Object.fromEntries([...core].map(([id, keys]) => [id, Object.fromEntries(keys)])),
    extensions: Object.fromEntries([...extensions].map(([id, sections]) => [id, {
      version: '1.0.0', contents: Object.fromEntries(Object.entries(sections)
        .filter(([, keys]) => keys.size).map(([section, keys]) => [section, Object.fromEntries(keys)]))
    }])),
    $reviewRequired: { core: [...coreWork.values()], extensions: [...extensionWork.values()] }
  };
}
