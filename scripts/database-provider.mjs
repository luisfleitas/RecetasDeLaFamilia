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

export function getDatabaseProvider(env = process.env) {
  if (env.DATABASE_PROVIDER === "postgres" || env.DATABASE_PROVIDER === "postgresql") {
    return "postgresql";
  }

  if (postgresUrlPattern.test(getDatabaseUrl(env))) {
    return "postgresql";
  }

  return "sqlite";
}

export function getProviderDatabaseUrl(provider, env = process.env) {
  const databaseUrl = getDatabaseUrl(env);

  if (provider === "postgresql" && postgresUrlPattern.test(databaseUrl)) {
    return databaseUrl;
  }

  if (provider === "sqlite" && databaseUrl && !postgresUrlPattern.test(databaseUrl)) {
    return databaseUrl;
  }

  return provider === "postgresql"
    ? "postgresql://recetas:recetas@localhost:5432/recetas"
    : "file:./dev.db";
}
