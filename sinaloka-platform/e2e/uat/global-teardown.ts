export default async function globalTeardown(): Promise<void> {
  console.log('[uat-teardown] Run complete. DB and state left intact for inspection.');
}
