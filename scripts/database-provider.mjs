const postgresUrlPattern = /^postgres(?:ql)?:\/\//i;

export function getDatabaseProvider(env = process.env) {
  if (env.DATABASE_PROVIDER === "postgres" || env.DATABASE_PROVIDER === "postgresql") {
    return "postgresql";
  }

  if (postgresUrlPattern.test(env.DATABASE_URL ?? "")) {
    return "postgresql";
  }

  return "sqlite";
}

export function getProviderDatabaseUrl(provider, env = process.env) {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  return provider === "postgresql"
    ? "postgresql://recetas:recetas@localhost:5432/recetas"
    : "file:./dev.db";
}
