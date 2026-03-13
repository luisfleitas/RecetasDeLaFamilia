declare module "better-sqlite3" {
  export default class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    exec(sql: string): this;
    close(): void;
  }
}
