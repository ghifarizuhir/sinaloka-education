/**
 * CJS-compatible shim for the generated Prisma client.
 * Jest cannot handle the generated client.ts because it uses `import.meta.url` (ESM-only).
 * This shim bypasses client.ts by importing directly from the internal files,
 * which don't use `import.meta.url`.
 *
 * The jest globalSetup patches the generated package.json to remove "type": "module"
 * so these imports can be transformed by ts-jest.
 */
import * as path from 'node:path';

// Set __dirname that Prisma runtime expects (normally set by client.ts)
globalThis['__dirname'] = path.resolve(__dirname, '../generated/prisma');

// Re-export everything from enums
export * from '../generated/prisma/enums';

// Re-export PrismaClient
import * as $Class from '../generated/prisma/internal/class';
import * as Prisma from '../generated/prisma/internal/prismaNamespace';
import * as runtime from '@prisma/client/runtime/client';

export const PrismaClient = $Class.getPrismaClientClass();
export type PrismaClient<
  LogOpts extends Prisma.LogLevel = never,
  OmitOpts extends Prisma.PrismaClientOptions['omit'] = Prisma.PrismaClientOptions['omit'],
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs,
> = $Class.PrismaClient<LogOpts, OmitOpts, ExtArgs>;
export { Prisma };
