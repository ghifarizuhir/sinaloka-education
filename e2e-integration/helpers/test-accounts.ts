export const ACCOUNTS = {
  SUPER_ADMIN: { email: 'super@sinaloka.com', password: 'password' },
  ADMIN_CERDAS: { email: 'admin@cerdas.id', password: 'password' },
  ADMIN_PRIMA: { email: 'admin@prima.id', password: 'password' },
  TUTOR1_CERDAS: { email: 'tutor1@cerdas.id', password: 'password' },
  TUTOR2_CERDAS: { email: 'tutor2@cerdas.id', password: 'password' },
  PARENT_CERDAS: { email: 'parent@cerdas.id', password: 'password' },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;
