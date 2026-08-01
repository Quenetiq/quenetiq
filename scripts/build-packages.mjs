import { execSync } from 'node:child_process';
import { existsSync, rmSync, symlinkSync, mkdirSync, cpSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist', 'quenetiq');
const NM = join(ROOT, 'node_modules', '@quenetiq');

const BUILD_ORDER = [
  'errors',
  'cache',
  'client',
  'core',
  'dev-server',
  'fragments',
  'downloader',
  'codegen',
  'ssr',
  'subscriptions',
  'middlewares',
  'pagination',
  'persisted-queries',
  'file-upload',
  'debugging',
  'testing',
  'apollo-adapter',
  'opentelemetry',
  'react',
  'vue',
  'eslint-plugin-gql',
];

// Packages compiled with tsc (not ng-packagr, not plain copy)
const TSC_PACKAGES = ['cache', 'client', 'react', 'vue', 'dev-server', 'opentelemetry', 'eslint-plugin-gql'];

function linkPackage(pkg, distOut) {
  const nmLink = join(NM, pkg);
  if (existsSync(nmLink)) {
    try { rmSync(nmLink, { recursive: true }); } catch {}
  }
  if (existsSync(distOut)) {
    mkdirSync(NM, { recursive: true });
    symlinkSync(resolve(distOut), nmLink, 'dir');
    console.log(`  🔗 Linked @quenetiq/${pkg} → ${resolve(distOut)}`);
  }
}

function fixDistPackageJson(distOut) {
  const pkgPath = join(distOut, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  function fixPath(path) {
    if (typeof path !== 'string') return path;
    let fixed = path.replace(/^\.\/src\//, './');
    fixed = fixed.replace(/^(.*)\.ts$/, '$1.js');
    return fixed;
  }

  function fixTypesPath(path) {
    if (typeof path !== 'string') return path;
    let fixed = path.replace(/^\.\/src\//, './');
    if (fixed.endsWith('.d.ts')) return fixed;
    fixed = fixed.replace(/^(.*)\.ts$/, '$1.d.ts');
    return fixed;
  }

  function fixExports(obj) {
    if (typeof obj === 'string') return fixPath(obj);
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        obj[k] = k === 'types' ? fixTypesPath(v) : fixExports(v);
      }
    }
    return obj;
  }

  if (pkg.main) pkg.main = fixPath(pkg.main);
  if (pkg.types) pkg.types = fixTypesPath(pkg.types);
  if (pkg.exports) pkg.exports = fixExports(pkg.exports);

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// ng-packagr/tsc emit compiled JS and declarations inline next to source files
// (e.g. core/src, cache/src). Remove any generated artifact that has a .ts
// sibling so the working tree stays clean; hand-written files (shims, scripts)
// have no .ts sibling and are preserved.
function purgeInlineArtifacts(pkgDir) {
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.js') || entry.name.endsWith('.js.map') || entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.ts.map')) {
        const stem = entry.name.replace(/\.(js|d\.ts)(\.map)?$/, '');
        if (existsSync(join(dir, `${stem}.ts`))) rmSync(path);
      }
    }
  };
  walk(join(pkgDir, 'src'));
}

function build(pkg) {
  console.log(`\n📦 Building @quenetiq/${pkg}...`);
  const pkgDir = join(ROOT, 'projects', 'quenetiq', pkg);
  const distOut = join(DIST, pkg);

  if (existsSync(join(pkgDir, 'ng-package.json'))) {
    // Angular package — build with ng-packagr
    const npxCmd = existsSync(join(ROOT, 'node_modules', '.bin', 'ng-packagr'))
      ? 'npx ng-packagr'
      : 'npx --yes ng-packagr';
    // Pass a self-contained tsconfig (ng-packagr default lib is es2018, too old
    // for es2020+ APIs such as Promise.allSettled; per-package configs extend
    // the root tsconfig and break ng-packagr's entry-point analysis).
    const ngTsconfig = join(ROOT, 'scripts', 'tsconfig.ngpackagr.json');
    execSync(`${npxCmd} -c ${ngTsconfig} -p ${pkgDir}/ng-package.json`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max_old_space_size=4096' },
    });
    purgeInlineArtifacts(pkgDir);
    linkPackage(pkg, distOut);
    return;
  }

  if (TSC_PACKAGES.includes(pkg)) {
    // TypeScript package — compile with tsc
    const tsconfig = join(pkgDir, 'tsconfig.lib.json');
    console.log(`  🔧 Compiling TypeScript...`);
    if (existsSync(distOut)) rmSync(distOut, { recursive: true });
    mkdirSync(distOut, { recursive: true });
    execSync(`npx tsc -p ${tsconfig}`, { cwd: ROOT, stdio: 'inherit' });
    cpSync(join(pkgDir, 'package.json'), join(distOut, 'package.json'));
    fixDistPackageJson(distOut);
    // Copy ambient shims (e.g. shims-vue.d.ts) and .vue SFC sources so that
    // dist consumers can both type-check and import the components at runtime.
    for (const shim of readdirSync(join(pkgDir, 'src')).filter((f) => f.endsWith('.d.ts'))) {
      cpSync(join(pkgDir, 'src', shim), join(distOut, shim));
    }
    const libDir = join(pkgDir, 'src', 'lib');
    if (existsSync(libDir)) {
      for (const f of readdirSync(libDir).filter((f) => f.endsWith('.vue'))) {
        cpSync(join(libDir, f), join(distOut, 'lib', f));
      }
    }
    // Copy subdirectories (angular/, bin/ etc.)
    for (const sub of ['angular', 'bin']) {
      const subDir = join(pkgDir, sub);
      if (existsSync(subDir)) {
        execSync(`cp -r ${subDir} ${distOut}/`, { cwd: ROOT, stdio: 'inherit' });
      }
    }
    for (const f of ['README.md', 'LICENSE']) {
      const p = join(pkgDir, f);
      if (existsSync(p)) cpSync(p, join(distOut, f));
    }
    purgeInlineArtifacts(pkgDir);
    linkPackage(pkg, distOut);
    return;
  }

    // Plain Node package — copy source directly
    console.log(`  ℹ️  Plain Node package, copying to dist/${pkg}`);
    if (existsSync(distOut)) rmSync(distOut, { recursive: true });
    mkdirSync(distOut, { recursive: true });
  execSync(`cp -r ${pkgDir}/src ${distOut}/ && cp ${pkgDir}/package.json ${distOut}/`, { cwd: ROOT, stdio: 'inherit' });
  for (const f of ['README.md', 'LICENSE']) {
    const p = join(pkgDir, f);
    if (existsSync(p)) execSync(`cp ${p} ${distOut}/`, { cwd: ROOT, stdio: 'inherit' });
  }
  linkPackage(pkg, distOut);
}

console.log('🚀 Building all @quenetiq packages in dependency order...\n');
for (const pkg of BUILD_ORDER) {
  build(pkg);
}
console.log('\n✅ All packages built!');
