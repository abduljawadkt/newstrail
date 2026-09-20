/**
 * Central environment access with validation.
 * Required vars are checked lazily (first access) so the build doesn't fail,
 * but runtime gives a clear error instead of a cryptic crash.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in your .env (see .env.example).`
    );
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get nextAuthSecret() {
    return required("NEXTAUTH_SECRET");
  },
  get appUrl() {
    return optional("APP_URL", optional("NEXTAUTH_URL", "http://localhost:3000"));
  },
  get easebuzzEnv() {
    return optional("EASEBUZZ_ENV", "test");
  },
  get easebuzzKey() {
    return optional("EASEBUZZ_KEY");
  },
  get easebuzzSalt() {
    return optional("EASEBUZZ_SALT");
  },
};

/** Call at startup to fail fast if core config is missing. */
export function assertCoreEnv() {
  const missing: string[] = [];
  for (const key of ["DATABASE_URL", "NEXTAUTH_SECRET"]) {
    if (!process.env[key]) missing.push(key);
  }
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`[env] Missing required variables: ${missing.join(", ")}`);
  }
  return missing.length === 0;
}
