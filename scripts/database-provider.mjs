const postgresUrlPattern = /^postgres(?:ql)?:\/\//i;
const vercelPostgresUrlKeys = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "recetas_DATABASE_URL",
  "recetas_POSTGRES_PRISMA_URL",
  "recetas_POSTGRES_URL",
];

export function getDatabaseUrl(env = process.env) {
  for (const key of vercelPostgresUrlKeys) {
    const value = env[key];
    if (value) {
      return value;
    }
  }

  return "";
}

export function getPostgresDatabaseUrl(env = process.env) {
  for (const key of vercelPostgresUrlKeys) {
    const value = env[key];
    if (value && postgresUrlPattern.test(value)) {
      return value;
    }
  }

  return "";
}

export function getDatabaseProvider(env = process.env) {
  const postgresDatabaseUrl = getPostgresDatabaseUrl(env);
  const canUseHostedPostgres =
    env.VERCEL === "1" || env.VERCEL_ENV || env.DATABASE_PROVIDER === "postgresql";

  if (
    (env.DATABASE_PROVIDER === "postgres" || env.DATABASE_PROVIDER === "postgresql") &&
    canUseHostedPostgres &&
    postgresDatabaseUrl
  ) {
    return "postgresql";
  }

  if (canUseHostedPostgres && postgresDatabaseUrl) {
    return "postgresql";
  }

  return "sqlite";
}

export function getProviderDatabaseUrl(provider, env = process.env) {
  const databaseUrl = getDatabaseUrl(env);

  if (provider === "postgresql") {
    return getPostgresDatabaseUrl(env) || "postgresql://recetas:recetas@localhost:5432/recetas";
  }

  if (provider === "sqlite" && databaseUrl && !postgresUrlPattern.test(databaseUrl)) {
    return databaseUrl;
  }

  return "file:./dev.db";
}
