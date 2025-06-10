import { StorageEngine } from "./storageEngines/StorageEngine";

export type BaseModel = {
  version: number;
};

type Migration = (obj: BaseModel) => BaseModel;

export function createModel(
  getId: (obj: BaseModel) => string,
  storageEngine: StorageEngine<BaseModel>,
  migrations: Migration[] = [],
  methods: Record<string, (...args: any[]) => any> = {}
) {
  function migrate(prev: BaseModel): BaseModel {
    if (!migrations) {
      return prev;
    }

    let cur = { ...prev };

    for (let i = cur.version - 1; i < migrations.length; i++) {
      const migration = migrations[i];

      if (!migration) {
        throw Error(
          `No migration from version ${i} to version ${i + 1} found.`
        );
      }

      cur = migration(cur);
    }

    return cur;
  }

  return {
    ...methods,
    ...storageEngine(getId, migrate),
  };
}
