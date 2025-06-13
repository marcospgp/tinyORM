type Dict = Record<string, any>;
type FunctionDict = Record<string, (...args: any[]) => any>;
type Migration = (obj: Dict) => Dict;

export function createModel<
  T extends Dict, // Model type
  S extends FunctionDict, // Storage engine return type
  M extends FunctionDict // Utility methods type
>(
  modelName: string,
  getId: (obj: T) => string,
  storageEngine: StorageEngine<T, S>,
  utilityMethods: M = {} as M,
  migrations: Migration[] = []
): M & S & { create(obj: T): T } {
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
      modelVersion: currentVersion,
      getId,
      migrate,
    }),
    create(obj: T): T {
      return {
        ...obj,
        __tinyorm_model_version: currentVersion,
      };
    },
  };
}

export type StorageEngineParams<T extends Dict> = {
  modelName: string;
  modelVersion: number;
  getId: (obj: T) => string;
  migrate: (prev: Dict, version: number) => T;
};

type StorageEngine<T extends Dict, R extends FunctionDict> = (
  params: StorageEngineParams<T>
) => R;
