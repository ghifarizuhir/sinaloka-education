import * as fs from 'fs';
import * as path from 'path';

export const STATE_FILE = path.resolve(__dirname, 'uat-state.json');

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
