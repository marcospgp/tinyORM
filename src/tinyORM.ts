export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type Migration<From extends JsonValue, To extends JsonValue> = (
  obj: From
) => To;
type Function = (...args: any[]) => any;
type RecursiveFunctionDict = {
  [key: string]: Function | RecursiveFunctionDict;
};

export function createModel<
  T extends JsonValue, // Model type
  S extends RecursiveFunctionDict, // Storage engine return type
  M extends RecursiveFunctionDict // Utility methods type
>(
  modelName: string,
  // Model type (T) is inferred by callers type annotating it into a specific
  // type here. Otherwise, it defaults to JsonValue.
  getId: (obj: T) => string,
  storageEngine: (params: StorageEngineParams<T>) => S,
  utilityMethods: M = {} as M,
  migrations: Migration<any, any>[] = []
) {
  const currentVersion = migrations.length + 1;

  // migrate() is a helper function passed to the storage engine.
  function migrate(prev: JsonValue, version: number): T {
    if (!migrations || version === currentVersion) {
      return prev as T;
    }

    let cur = Array.isArray(prev)
      ? [...prev]
      : typeof prev === "object" && prev !== null
      ? { ...prev }
      : prev;

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

export type StorageEngineParams<T extends JsonValue> = {
  modelName: string;
  currentVersion: number;
  getId: (obj: T) => string;
  migrate: (prev: JsonValue, version: number) => T;
};
