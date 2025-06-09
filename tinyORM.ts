/* eslint-disable @typescript-eslint/no-explicit-any */

export type BaseModel = {
  // Will type field be necessary?
  // type: string;
  version: number;
};

// A type that given a list of types represents a list of functions that convert between each of
// those types in order.
// So given types V1, V2, etc. it represents (x: V1) => V2, etc.
type MigrationTuple<Ts extends BaseModel[]> = Ts extends [
  infer From extends BaseModel,
  infer To extends BaseModel,
  ...infer Rest extends BaseModel[]
]
  ? [(from: From) => To, ...MigrationTuple<[To, ...Rest]>]
  : [];

// Get the last type in a list of types.
type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never;

/**
 * "Versions" represents all the historical types for the model, up to latest.
 * "Last<Versions>" represents the latest type for the model.
 * "MigrationTuple<Versions>" is a list of migration functions that convert between each successive
 * type.
 */
export function createModel<Versions extends BaseModel[]>(
  getId: (obj: Last<Versions>) => string,
  methods: Record<string, (...args: any[]) => any>,
  migrations: MigrationTuple<Versions>,
  storageEngine: (
    getId: (obj: Last<Versions>) => string,
    migrate: (prev: BaseModel) => Last<Versions>
  ) => Record<string, (...args: any[]) => any>
) {
  function migrate(prev: BaseModel): Last<Versions> {
    let cur = { ...prev };
    // Apply migrations.
    for (let i = cur.version; i < migrations.length + 1; i++) {
      const migration = migrations[i - 1];

      if (!migration) {
        throw Error(
          `No migration from version ${i} to version ${i + 1} found.`
        );
      }

      cur = migration(cur);
    }
    return cur as Last<Versions>;
  }

  return {
    ...methods,
    ...storageEngine(getId, migrate),
  };
}
