import * as fs from 'node:fs';
import * as path from 'node:path';

export default function globalSetup() {
  // Patch generated prisma package.json to remove "type": "module"
  // so ts-jest can transform the generated files as CJS
  const pkgPath = path.resolve(__dirname, '../generated/prisma/package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  // Store original for teardown
  fs.writeFileSync(
    pkgPath + '.bak',
    JSON.stringify(pkg, null, 2),
  );

  // Remove "type": "module" so jest treats .ts files as CJS
  delete pkg.type;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}
