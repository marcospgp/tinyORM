# tinyORM

[![npm version](https://img.shields.io/npm/v/@marcospgp/tiny-orm?label=npm%20package&color=#4DC621)](https://www.npmjs.com/package/@marcospgp/tiny-orm)

A minimal typescript storage layer radically optimized toward development speed.

TinyORM's [core](./src/tinyORM.ts) will never exceed 100 lines of zero-dependency code.

## Install

```shell
npm i @marcospgp/tiny-orm
```

```shell
bun add @marcospgp/tiny-orm
```

```shell
pnpm add @marcospgp/tiny-orm
```

## What is TinyORM?

You're a builder who wants to ship instead of designing the perfect database schema before you get your first user. TinyORM is for you!

You start by defining your schema using regular typescript types:

```typescript
type User = {
  username: string;
  email: string;
};
```

You then create a model for that type:

```typescript
const userModel = createModel(
  "user", // The model's name
  (user: User) => user.username, // Showing how to get a unique ID
  inMemoryStorageEngine, // Specifying a storage engine
  (storageMethods) => ({ ...storageMethods }) // Exposing all storage methods
);
```

Your model's type is inferred from the type annotation in the second parameter above, which is a function showing how to get a unique ID from an object of that type.

You can then simply create objects:

```typescript
const user: User = {
  username: "hunter2",
  email: "hunter2@example.com",
};
```

And rely on the model to store and retrieve data. It simply exposes the methods provided by the storage engine:

```typescript
await userModel.save(user);

const retrievedUser = userModel.get("hunter2");
console.log(retrievedUser.email); // Logs "hunter2@example.com"
```

Because your data is exposed as plain objects, you can just use them with any libraries that expect this format. With React, for example, you can store them in state or pass them to your components as props.

For the fastest way to get started, check out the following examples:

1. [Specifying your first type](./tests/firstType.test.ts)
1. [Adding utility methods](./tests/utilityMethods.test.ts)
1. [Updating your type and specifying a migration](./tests/firstMigration.test.ts)
1. [Creating a custom storage engine](./tests/customStorageEngine.test.ts)
1. [Creating a higher level storage engine](./tests/higherLevelStorageEngine.test.ts)

TinyORM's codebase is written to be simple and accessible. Don't hesitate to jump into the code and see what's going on for yourself!

## Migrations

Because SQL came before the agile manifesto, it still expects you to know everything about what you're building ahead of time.

Relational databases expect all stored data to be on the latest version of its schema, with migrations maintained in a database-specific language and applied all at once in a world-stopping fashion.

Document databases promised to simplify storage for everyone, but followed in the same footsteps - simply reinventing SQL in the form of yet another complex querying language, this time with more brackets.

You're expected to pick a single database, write migrations it understands, and apply them at exactly the right time.

With TinyORM, your migrations are just typescript code that lives alongside your app. The main differentiating factor, however, is that they are applied at data retrieval time. This has many benefits:

- Because you don't have to run migrations on your databases, you can store data anywhere - even on your users' devices.
- Because you don't have to maintain database-specific migrations, you can combine more than one storage medium - such as storing data in `localStorage` for logged out users and in a cloud database for logged in users.
- You don't have to sync your app's state with database state. There is no time-sensitive logic to run when deploying a new version of your app, and nothing goes wrong for a user that isn't running on the latest version.

For an example, let's say you realized users should have physical addresses instead of emails. We can start with the `User` type we used earlier, renamed to `UserV1` to free up the `User` type for the new schema:

```typescript
type UserV1 = {
  username: string;
  email: string;
};
```

You can simply define the new type however you like:

```typescript
type UserV2 = Omit<UserV1, "email"> & {
  address: string;
};

type User = UserV2; // Aliasing the User type to latest schema version.
```

All you have to do is provide the model with a migration function, which shows how to go from a v1 user to a v2 one:

```typescript
createModel(
  "user",
  (user: User) => user.username,
  inMemoryStorageEngine,
  (storageMethods) => ({ ...storageMethods }),
  [
    (prev: UserV1): UserV2 => {
      // Remove email field.
      const { email: _, ...rest } = prev;
      // Add address field.
      return { ...rest, address: "unknown" };
    },
  ]
);
```

The model infers your schema's version from how many migrations you provided, and passes it along to the storage engine.

The storage engine stores the version alongside the data, and uses this information to migrate it to the latest version on retrieval.

The type annotations will help catch most mistakes, but it's still possible to write a buggy migration - just like it's possible to introduce a bug in any other part of your codebase. Proper error reporting in production will help you be aware of any problems your users may run into.

One important thing to watch out for is to ensure your migrations are always deterministic, as your application may retrieve the same object twice before storing it again. An alternative would be to make your storage engine store any outdated objects right after migrating them, and before returning them, but this is not ideal - it will make your reads slower, and is prone to concurrency issues when fetching the same outdated data from more than one part of your application asynchronously.

## Storage engines

TinyORM is maximally flexible and acts as a simple foundation that you can build upon. In line with this, it does not enforce a fixed storage API for storage engines.

Storage mediums can vary radically - from simple key-value stores to SQL and vector databases - and so can storage engines and the methods they expose.

You're not expected to define your schema perfectly from the start, and the same goes for your storage logic.

You can start by picking from one of the included [storage engines](./src/storageEngines), then introducing more custom functionality as you go.

Because migrations are applied at retrieval time, data is not guaranteed to be held in storage on the latest version of your schema. You can still query your data for specific fields however, by enforcing certain fields to always be present.

Storage engines can enforce fields by constraining their generic type (with `T extends ConstrainedType`). For example, you should always enforce timestamp fields (such as `_created_at` and `_updated_at`) unless there's a good reason not to.

A storage engine can then rely on and expose querying functionality for any fields it enforces.

Because storage engines can't be migrated, these fields have to be set from the start. Modifying them may cause your storage engine to break when retrieving previously stored data.

The TinyORM approach is to limit your data querying at the database level to a high granularity, such as getting all data for a given day. You can then process your data further once it has been retrieved.

The idea is to treat your storage as more of a cloud backup and less as a second app running on a remote server that you have to maintain.

There is no need to hyperoptimize your storage - your users are going to be downloading 100GB+ games and streaming 4k video, so querying for specific fields to avoid a few extra bytes makes no sense in almost all scenarios.

Complex calculations can also be cached and stored alongside the data.

There are several benefits to keeping your finer data processing logic on the client side:

- No database-specific querying languages
- All of your data processing logic is plain typescript
- Processing happens on the user's device (less demand for server compute)

## Using with React

TinyORM includes a `useStoredObjects` hook factory that makes it easy to create a hook for your models to be used in React components.

Simply call it passing in CRUD methods from your model:

```typescript
export const useProjects = createStoredObjectsHook(modelName, {
  getId,
  create: someModel.create,
  getAll: someModel.getAll,
  get: someModel.get,
  update: someModel.persist,
  delete: someModel.delete,
});
```

You can also pass it an optional max cache age.

You can then use it like so:

```typescript
const somethings = useSomething();
```

Or in more interesting ways, like filtering all objects to retrieve only a subset:

```typescript
const somethings = useSomething(
  (thing: Something) => isThisIt(thing),
);
```

Or passing in a list of object IDs:

```typescript
const somethings = useSomething([id1, id2, id3]);
```

This hook:

- triggers a rerender when an object your component has received is updated by any other component
- keeps a cache keyed by object ID, so redundant fetches are avoided
- refetches stale objects on rerender
- handles concurrency out of the box, avoiding multiple fetches caused by simultaneous requests for the same objects

See the annotation comment in the [hook factory's source]((./src/useStoredObjects.ts)) for more info.

## Maintainers

This project uses [bun](https://bun.sh) for dependency management and its build system.

To get started, simply run `bun install`.

To run tests, run `bun test`. Note tests rely on the built package, so you'll have to run `bun run build:noTest` after making any changes to see them reflected in the tests. `bun run build` will fail if the tests don't pass.

To build for production, run `bun run build`. Add `--watch` to watch for changes.

To work on this package while using it in a project, you can link it as a dependency:

```shell
# Run this from this project's directory to register it as a linkable package with bun.
bun link

# Then add the linked package as a dependency in the other project.
cd /path/to/other/project
bun link @hesoyam.zip/tiny-orm
```

To publish a new version of the package to npm, bump the version in `package.json` and run `bun publish`. This will run the `prepublishOnly` script before publishing.
