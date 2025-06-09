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

// tinyORM must enforce a base model with document type and version
// There is only one rule: never change your model without bumping its version.
// If you do so, you're at risk of having later migrations be incompatible with one of those models.

// storage engine interface is not set in stone.
// just like we avoid defining db schema from the start, we also avoid
// defining the storage engine API.
// the downside is that you can't switch between storage engines with zero effort.
// but how often do people switch storage engines anyway?
// so users will pick a storage engine, or write a custom one and build it as they go.
// the complexity of the storage engine grows with their project.
// but maybe there should be a bare minimum? hmmmmmmmm nah. users just check the API for their
// storage engine. it overlaps with the model, sure, but we can set a convention:
// model methods are always > 1 word. like getFullName, getBirthdayIso, etc.
// hmm but storage engine methods can also be mustGet, getOne, etc.
// hmhm.

// maybe the convention can be:
// - model can only have fields and properties
// - storage engine is the only one that can add methods
// hmmm but model may need methods too idk

// There is one requirement for storage engines: apply migrations after retrieving items.
// storage engine can be a factory function that takes in a migrate function!

// The model doesn't contain the data! objects are plain objects. model has methods!

// A storage engine is a function that takes in a migrate function and generates a collection of
// methods.
// The migrate function must be called when retrieving data, to ensure it is up to date with latest
// schema.

// If you break something or get corrupted data, you just need to update your migration function for
// that version to handle the broken data!

// make a promise about the line count!!!! like always < 100 lines for core library? (aka not storage engines)

// the core idea is everything lives in your app code and happens at runtime. no world stopping migrations, no SQL.
// extreme optimization towards simplicity, ease of use, developer speed. for indie hackers and builders that care about shipping.
