import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const PKGS_DIR = join(ROOT, 'projects', 'quenetiq');
const CORE_PKG = join(PKGS_DIR, 'core', 'package.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}
function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

function currentVersion() {
  return readJson(CORE_PKG).version;
}

function nextVersion(current, type) {
  const parts = current.split('-')[0].split('.').map(Number);
  let [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch': {
      const base = current.split('-')[0];
      const pMatch = base.match(/\.(\d+)$/);
      return `${major}.${minor}.${parseInt(pMatch[1]) + 1}`;
    }
    case 'rc': {
      const rcMatch = current.match(/-rc\.(\d+)$/);
      const rc = rcMatch ? parseInt(rcMatch[1]) + 1 : 1;
      const base = rcMatch ? current.replace(/-rc\.\d+$/, '') : `${major}.${minor}.${patch}`;
      return `${base}-rc.${rc}`;
    }
    case 'beta': {
      const bMatch = current.match(/-beta\.(\d+)$/);
      const b = bMatch ? parseInt(bMatch[1]) + 1 : 1;
      const base = bMatch ? current.replace(/-beta\.\d+$/, '') : `${major}.${minor}.${patch}`;
      return `${base}-beta.${b}`;
    }
    case 'alpha': {
      const aMatch = current.match(/-alpha\.(\d+)$/);
      const a = aMatch ? parseInt(aMatch[1]) + 1 : 1;
      const base = aMatch ? current.replace(/-alpha\.\d+$/, '') : `${major}.${minor}.${patch}`;
      return `${base}-alpha.${a}`;
    }
    default:
      throw new Error(`Unknown version type: ${type}. Use: major, minor, patch, rc, beta, alpha`);
  }
}

const type = process.argv[2];
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');
const noCommit = process.argv.includes('--no-commit');

// Extract --version <value> if present
const versionIdx = process.argv.indexOf('--version');
const customVersion = versionIdx >= 0 ? process.argv[versionIdx + 1] : null;

if (!type) {
  console.log('Usage: node scripts/version.mjs <major|minor|patch|rc|beta|alpha|custom> [--version x.y.z] [--dry-run] [--no-commit]');
  process.exit(1);
}

const cur = currentVersion();
let next;

if (type === 'custom') {
  if (!customVersion) {
    console.error('Error: --version <version> is required when type is "custom"');
    process.exit(1);
  }
  next = customVersion;
} else {
  next = nextVersion(cur, type);
}

console.log(`  Current: ${cur}`);
console.log(`  Next:    ${next}`);

function bumpFile(pkgPath, name) {
  if (!existsSync(pkgPath)) return;
  const pkg = readJson(pkgPath);
  pkg.version = next;
  writeJson(pkgPath, pkg);
  console.log(`  ✓ ${name} → ${next}`);
}

if (!dryRun) {
  // Bump all packages
  const dirs = [PKGS_DIR];
  for (const dir of dirs) {
    for (const entry of readdirSync(dir)) {
      const pkgPath = join(dir, entry, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = readJson(pkgPath);
        if (pkg.name?.startsWith('@quenetiq/')) {
          bumpFile(pkgPath, pkg.name);
        }
      }
    }
  }

  // Bump root package.json
  bumpFile(join(ROOT, 'package.json'), 'root');

  // Update VersionService with new version for docs version selector
  const versionServicePath = join(ROOT, 'src', 'app', 'shared', 'services', 'version.service.ts');
  if (existsSync(versionServicePath)) {
    let vsContent = readFileSync(versionServicePath, 'utf-8');
    if (!vsContent.includes(`'${next}'`)) {
      vsContent = vsContent.replace(
        /(private readonly allVersions = \[)([^\]]*)(\])/,
        (_, pre, versions, post) => {
          const existing = versions.split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
          if (!existing.includes(next)) {
            existing.unshift(next);
          }
          return `${pre}${existing.map(v => `'${v}'`).join(', ')}${post}`;
        },
      );
      writeFileSync(versionServicePath, vsContent);
      console.log(`  ✓ VersionService updated with ${next}`);
    }
  }

  // Also bump dist/quenetiq/* if present (for local publish testing)
  const distDir = join(ROOT, 'dist', 'quenetiq');
  if (existsSync(distDir)) {
    for (const entry of readdirSync(distDir)) {
      const pkgPath = join(distDir, entry, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = readJson(pkgPath);
        if (pkg.name?.startsWith('@quenetiq/')) {
          pkg.version = next;
          writeJson(pkgPath, pkg);
        }
      }
    }
  }
} else {
  console.log(`\n  [DRY RUN] Files NOT modified`);
}

if (dryRun) {
  console.log(`\n  [DRY RUN] Skipping git commit + tag`);
} else if (noCommit) {
  console.log(`\n  [NO COMMIT] Version files updated, skipping git ops`);
} else {
  try {
    execSync(`git add -A && git commit -m "chore: bump to ${next}"`, { cwd: ROOT, stdio: 'inherit' });
  } catch {
    console.log(`\n  No changes to commit (already at ${next})`);
  }
  try {
    execSync(`git tag v${next}`, { cwd: ROOT, stdio: 'inherit' });
    console.log(`\n  Tagged: v${next}`);
  } catch {
    console.log(`\n  Tag v${next} already exists`);
  }
  console.log(`\n  Run: git push origin v${next} --no-verify`);
}
