#!/usr/bin/env node
const { readFileSync, readdirSync, statSync, writeFileSync, existsSync } = require('fs');
const { join, resolve } = require('path');

const APOLLO_PATTERNS = [
  { pattern: /from\s+['"]@apollo\/client['"]/g, apollo: "@apollo/client import", quenetiq: "import from '@quenetiq/client' or '@quenetiq/core'", fixable: true },
  { pattern: /from\s+['"]apollo-angular['"]/g, apollo: "apollo-angular import", quenetiq: "import from '@quenetiq/core'", fixable: true },
  { pattern: /import\s*{[^}]*ApolloClient[^}]*}\s*from/g, apollo: "ApolloClient", quenetiq: "QuenetiqClient (from @quenetiq/client)", fixable: true },
  { pattern: /import\s*{[^}]*InMemoryCache[^}]*}\s*from/g, apollo: "InMemoryCache", quenetiq: "CacheStore (from @quenetiq/cache)", fixable: true },
  { pattern: /import\s*{[^}]*ApolloProvider[^}]*}\s*from/g, apollo: "ApolloProvider", quenetiq: "QuenetiqProvider (from @quenetiq/react)", fixable: true },
  { pattern: /new\s+ApolloClient\s*\(/g, apollo: "new ApolloClient()", quenetiq: "new QuenetiqClient()", fixable: false },
  { pattern: /new\s+InMemoryCache\s*\(/g, apollo: "new InMemoryCache()", quenetiq: "new CacheStore()", fixable: false },
  { pattern: /cache\.readQuery\s*\(/g, apollo: "cache.readQuery()", quenetiq: "cache.query(__typename, id)", fixable: false },
  { pattern: /cache\.writeQuery\s*\(/g, apollo: "cache.writeQuery()", quenetiq: "cache.write(entity)", fixable: false },
  { pattern: /cache\.evict\s*\(/g, apollo: "cache.evict()", quenetiq: "cache.evict(__typename, id)", fixable: false },
  { pattern: /cache\.modify\s*\(/g, apollo: "cache.modify()", quenetiq: "cache.merge()", fixable: false },
  { pattern: /cache\.gc\s*\(\)/g, apollo: "cache.gc()", quenetiq: "cache.collectGarbage()", fixable: false },
  { pattern: /client\.query\s*\(\s*\{/g, apollo: "client.query({ query, variables })", quenetiq: "client.query(query, variables)", fixable: false },
  { pattern: /client\.mutate\s*\(\s*\{/g, apollo: "client.mutate({ mutation, variables })", quenetiq: "client.mutate(document, variables)", fixable: false },
  { pattern: /subscribeToMore\s*\(/g, apollo: "subscribeToMore()", quenetiq: "useLiveQuery() (from @quenetiq/react or @quenetiq/vue)", fixable: false },
  { pattern: /refetchQueries\s*:/g, apollo: "refetchQueries option", quenetiq: "client.refetch() or useQuery().refetch()", fixable: false },
  { pattern: /optimisticResponse\s*:/g, apollo: "optimisticResponse", quenetiq: "optimistic option in mutate()", fixable: false },
  { pattern: /errorPolicy\s*:/g, apollo: "errorPolicy", quenetiq: "Config option in QuenetiqClient / GraphqlService", fixable: false },
  { pattern: /fetchPolicy\s*:/g, apollo: "fetchPolicy", quenetiq: "Config option in QuenetiqClient", fixable: false },
  { pattern: /pollInterval\s*:/g, apollo: "pollInterval", quenetiq: "pollInterval option in hooks v2", fixable: false },
  { pattern: /typePolicies\s*:/g, apollo: "typePolicies", quenetiq: "Zero-config \u2014 auto __typename + id detection in @quenetiq/cache", fixable: false },
  { pattern: /keyFields\s*:/g, apollo: "keyFields", quenetiq: "Zero-config \u2014 auto __typename + id detection in @quenetiq/cache", fixable: false },
  { pattern: /@apollo\/angular\/[a-z-]+/g, apollo: "apollo-angular sub-package", quenetiq: "import from '@quenetiq/core'", fixable: true },
];

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches = [];

  for (const entry of APOLLO_PATTERNS) {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      entry.pattern.lastIndex = 0;
      if (entry.pattern.test(line)) {
        matches.push({
          file: filePath,
          line: lineIdx + 1,
          apolloApi: entry.apollo,
          quenetiqEquivalent: entry.quenetiq,
          autoFixable: entry.fixable,
        });
      }
    }
  }

  return matches;
}

function scanDir(dir) {
  const matches = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (entry.startsWith('.') || entry === 'node_modules') continue;

    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      matches.push(...scanDir(fullPath));
    } else if (/\.(ts|js|tsx|jsx)$/.test(entry)) {
      try {
        matches.push(...scanFile(fullPath));
      } catch {}
    }
  }

  return matches;
}

function applyAutoFix(matches) {
  let fixed = 0;
  const fileGroups = {};

  for (const m of matches) {
    if (!m.autoFixable) continue;
    if (!fileGroups[m.file]) fileGroups[m.file] = [];

    let oldStr = m.apolloApi;
    let newStr = m.quenetiqEquivalent;

    if (m.apolloApi.includes('@apollo/client') || m.apolloApi.includes('apollo-angular')) {
      newStr = m.apolloApi.includes('angular') ? "'@quenetiq/core'" : "'@quenetiq/client'";
    }
    if (m.apolloApi === 'ApolloClient') newStr = 'QuenetiqClient';
    if (m.apolloApi === 'InMemoryCache') newStr = 'CacheStore';
    if (m.apolloApi === 'ApolloProvider') newStr = 'QuenetiqProvider';

    if (oldStr !== newStr) {
      fileGroups[m.file].push({ old: oldStr, new: newStr });
    }
  }

  for (const [file, replacements] of Object.entries(fileGroups)) {
    let content = readFileSync(file, 'utf-8');
    let changed = false;
    for (const { old: oldStr, new: newStr } of replacements) {
      if (content.includes(oldStr)) {
        content = content.split(oldStr).join(newStr);
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(file, content, 'utf-8');
      fixed += replacements.length;
    }
  }

  return fixed;
}

function printReport(summary) {
  console.log('\n\u{1F4CB} Apollo \u2192 Quenetiq Migration Report');
  console.log('\u2550'.repeat(50));
  console.log(`  Files scanned:   ${summary.scannedFiles}`);
  console.log(`  Issues found:    ${summary.totalIssues}`);
  console.log(`  Auto-fixable:    ${summary.autoFixable}`);
  console.log('\u2550'.repeat(50));

  if (summary.matches.length === 0) {
    console.log('  \u2705 No Apollo patterns found \u2014 you\'re already on Quenetiq!');
    return;
  }

  const byFile = {};
  for (const m of summary.matches) {
    if (!byFile[m.file]) byFile[m.file] = [];
    byFile[m.file].push(m);
  }

  for (const [file, fileMatches] of Object.entries(byFile)) {
    console.log(`\n\u{1F4C4} ${file} (${fileMatches.length} issues)`);
    for (const m of fileMatches) {
      const fixLabel = m.autoFixable ? '\uD83D\uDD27 auto-fix' : '   \u26A0\uFE0F manual';
      console.log(`  ${fixLabel} L${m.line}: ${m.apolloApi}`);
      console.log(`           \u2192 ${m.quenetiqEquivalent}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix') || args.includes('-f');
  const targetDir = args.find(a => !a.startsWith('-')) || '.';

  if (!existsSync(targetDir)) {
    console.error(`\u274C Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const targetPath = resolve(targetDir);

  console.log(`\uD83D\uDD0D Scanning ${targetPath} for Apollo patterns...`);
  const matches = scanDir(targetPath);

  const uniqueFiles = [...new Set(matches.map(m => m.file))];
  const summary = {
    scannedFiles: uniqueFiles.length || 1,
    totalIssues: matches.length,
    autoFixable: matches.filter(m => m.autoFixable).length,
    matches,
  };

  printReport(summary);

  if (fixMode && summary.autoFixable > 0) {
    const fixed = applyAutoFix(matches);
    console.log(`\n\uD83D\uDD27 Auto-fixed ${fixed} patterns`);
    if (fixed > 0) {
      console.log('  \u26A0\uFE0F Review changes and run your tests before committing.');
    }
  }

  if (fixMode && summary.autoFixable === 0) {
    console.log('\n  No auto-fixable patterns found. Manual migration required.');
  }
}

main();
