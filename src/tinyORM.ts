type Dict = Record<string, any>;
type FunctionDict = Record<string, (...args: any[]) => any>;
type Migration<From extends Dict, To extends Dict> = (obj: From) => To;

export function createModel<
  T extends Dict, // Model type
  S extends FunctionDict, // Storage engine return type
  M extends FunctionDict // Utility methods type
>(
  modelName: string,
  // Model type (T) is inferred by callers type annotating it into a specific
  // type here. Otherwise, it defaults to Dict.
  getId: (obj: T) => string,
  storageEngine: (params: StorageEngineParams<T>) => S,
  utilityMethods: M = {} as M,
  migrations: Migration<any, any>[] = []
) {
  const currentVersion = migrations.length + 1;

  // migrate() is a helper function passed to the storage engine.
  function migrate(prev: Dict, version: number): T {
    if (!migrations || version === currentVersion) {
      return prev as T;
    }

    let cur = { ...prev };

    for (let i = version - 1; i < migrations.length; i++) {
      const migration = migrations[i];

      if (!migration) {
        throw Error(
          `No migration from version ${i + 1} to version ${i + 2} found.`
        );
      }

      cur = migration(cur);
    }

    return cur as T;
  }

  return {
    ...utilityMethods,
    ...storageEngine({
      modelName,
      currentVersion,
      getId,
      migrate,
    }),
  };
}

export type StorageEngineParams<T extends Dict> = {
  modelName: string;
  currentVersion: number;
  getId: (obj: T) => string;
  migrate: (prev: Dict, version: number) => T;
};
