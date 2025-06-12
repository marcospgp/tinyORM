// ### Storage engines

// One of the main strengths of TinyORM is that it is database agnostic. You can write a custom storage engine that mixes together multiple ones - such as storing data in `localStorage` for guest users, and in a postgreSQL database for logged in ones.

// TinyORM ships with a [`localStorage`](./storageEngines/localStorage.ts) and a postgreSQL (coming soon!) storage engine out of the box.

// A storage engine is just a function that receives two parameters:

// - A function that given an object will return its ID
// - A migrate function that brings an object up to the latest version of its data type

// Both of these are defined by the user for a given data type.

// The storage engine function then uses these to return a collection of methods that handle the storage and retrieval of data.

// ```typescript
// // The storage engine function can access the type of object it is going to be storing through the
// // generic parameter T.
// // You can call this parameter anything you want, but it should always extend BaseModel, which ensures it has
// // a version field.
// function timestampedLocalStorageEngine<T extends BaseModel>(
//   getId: (obj: T) => string,
//   migrate: (prev: BaseModel) => T
// ) {
//   const ls = localStorageEngine(getId, migrate);

//   return {
//     // This custom storage engine mostly just exposes functionality from the existing localStorageEngine.
//     ...ls,
//     // We do however override the save method with one that logs a timestamp.
//     save(obj: T) {
//       obj["updated_at"] = new Date().toISOString();

//       ls.save(obj);
//     },
//   };
// }
// ```

// The only thing a storage engine has to keep in mind is to always run an object through the migrate function after retrieving it, to make sure no data is ever returned in an outdated format. The exception is when it is relying on another storage engine, which should already be taking care of that.

// export type TimestampedModel = BaseModel & {
//   /** ISO timestamp. */
//   created_at: string;
//   /** ISO timestamp. */
//   updated_at: string;
// };

// export function timestampedLocalStorageEngine<T extends TimestampedModel>(
//   getId: (obj: T) => string,
//   migrate: (prev: BaseModel) => T
// ) {
//   const ls = localStorageEngine(getId, migrate);

//   return {
//     ...ls,
//     save(id: string, obj: TimestampedModel) {
//       obj.updated_at = new Date().toISOString();

//       localStorage.setItem(id, JSON.stringify(obj));
//     },
//   };
// }

// createModel(
//   (obj: TimestampedModel) => String(obj.version),
//   timestampedLocalStorageEngine,
//   {},
//   []
// );
