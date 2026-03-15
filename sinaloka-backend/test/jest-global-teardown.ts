import * as fs from 'node:fs';
import * as path from 'node:path';

export default function globalTeardown() {
  // Restore the original generated prisma package.json
  const pkgPath = path.resolve(__dirname, '../generated/prisma/package.json');
  const bakPath = pkgPath + '.bak';

  if (fs.existsSync(bakPath)) {
    const original = fs.readFileSync(bakPath, 'utf-8');
    fs.writeFileSync(pkgPath, original);
    fs.unlinkSync(bakPath);
  }
}
