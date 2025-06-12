type Dict = Record<string, any>;
type FunctionDict = Record<string, (...args: any[]) => any>;
type Migration = (obj: Dict) => Dict;

export function createModel<
  T extends Record<string, any>,
  S extends Record<string, (...args: any[]) => any>,
  M extends Record<string, (...args: any) => any>
>(
  modelName: string,
  getId: (obj: T) => string,
  storageEngine: StorageEngine<T, S>,
  methods: M = {} as M,
  migrations: Migration[] = []
): M & S & { create(obj: T): T } {
  const currentVersion = migrations.length + 1;

  // migrate() is a helper function passed to the storage engine.
  function migrate(prev: Record<string, any>, version: number): T {
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
    ...methods,
    ...storageEngine(modelName, currentVersion, getId, migrate),
    create(obj: T): T {
      return {
        ...obj,
        __tinyorm_model_version: currentVersion,
      };
    },
  };
}

type StorageEngine<T extends Dict, R> = (
  modelName: string,
  modelVersion: number,
  getId: (obj: T) => string,
  migrate: (prev: Dict, version: number) => T
) => R;

/**
 * Helper function that allows defining storage engine function without having
 * to import types, by passing it in as a parameter.
 */
export function createStorageEngine<T extends Dict, R extends FunctionDict>(
  engine: StorageEngine<T, R>
) {
  return engine;
}
