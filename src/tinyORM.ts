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

export type RecursiveFunctionDict = {
  [key: string]: Function | RecursiveFunctionDict;
};

export function createModel<
  T extends JsonValue,
  S extends RecursiveFunctionDict,
  M extends RecursiveFunctionDict
>(
  modelName: string,
  /**
   * Annotating the obj parameter in this callback with the intended type will
   * make typescript infer it as the type for this model.
   * Specifying the type with the generic syntax (createModel<T>()) is not
   * practical as there are other generic type parameters, and all must be
   * either inferred or manually specified at once.
   */
  getId: (obj: T) => string,
  storageEngine: StorageEngine<T, S>,
  methodsFactory: (storageMethods: S) => M,
  migrations?: Migration<any, any>[]
) {
  const currentVersion = migrations ? migrations.length + 1 : 1;

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
          `No migration from version ${i + 1} to version ${
            i + 2
          } of model ${modelName} found.`
        );
      }

      try {
        cur = migration(cur);
      } catch (e) {
        console.error(
          `Failed to migrate object from version ${i + 1} to version ${
            i + 2
          } of model ${modelName}:`
        );
        console.error(JSON.stringify(cur, null, 4));
        throw e;
      }
    }

    return cur as T;
  }

  const storageMethods = storageEngine({
    modelName,
    currentVersion,
    getId,
    migrate,
  });

  return {
    ...methodsFactory(storageMethods),
  };
}

type StorageEngine<T extends JsonValue, R extends RecursiveFunctionDict> = (
  params: StorageEngineParams<T>
) => R;

export type StorageEngineParams<T> = {
  modelName: string;
  currentVersion: number;
  getId: (obj: T) => string;
  migrate: (prev: JsonValue, version: number) => T;
};
