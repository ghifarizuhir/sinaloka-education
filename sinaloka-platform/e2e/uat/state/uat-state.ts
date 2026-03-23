import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STATE_FILE = path.resolve(__dirname, 'uat-state.json');
export const TOKEN_CACHE_FILE = path.resolve(__dirname, 'token-cache.json');

export interface Credentials {
  email: string;
  password: string;
}

export interface Phase0State {
  institutionId: string;
  institutionName: string;
  adminCredentials: Credentials;
}

export interface Phase1State {
  subjectIds: string[];
  roomIds: string[];
  newAdminPassword: string;
}

export interface Phase2State {
  studentIds: string[];
  tutorIds: string[];
}

export interface Phase3State {
  classIds: string[];
}

export interface UatState {
  superAdmin: Credentials;
  phase0: Phase0State | null;
  phase1: Phase1State | null;
  phase2: Phase2State | null;
  phase3: Phase3State | null;
}

export function readState(): UatState {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`[uat-state] State file not found: ${STATE_FILE}. Did global-setup run?`);
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

export function writeState(state: UatState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmp, STATE_FILE);
}

// NOTE: Not safe for concurrent access. Relies on fullyParallel:false + workers:1.
export function patchState(patch: Partial<UatState>): void {
  const current = readState();
  writeState({ ...current, ...patch });
}

// --- Token cache (persistent across runs to avoid rate limiting) ---

export interface TokenEntry {
  access_token: string;
  refresh_token: string;
  obtained_at: number;
}

export function readTokenCache(): Map<string, TokenEntry> {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch { /* corrupt — start fresh */ }
  return new Map();
}

export function writeTokenCache(cache: Map<string, TokenEntry>): void {
  fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(Object.fromEntries(cache), null, 2), 'utf-8');
}

export function clearTokenCache(): void {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    fs.unlinkSync(TOKEN_CACHE_FILE);
  }
}
