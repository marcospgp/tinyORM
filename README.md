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

These are the core ideas behind it:

- Your schemas are defined as regular typescript types.
- You can update your types at any time by providing a migration, which is just a plain typescript function that updates an object from the previous version to the new one.
- Migrations are applied at retrieval time. This abstracts away an entire class of complexity by not having to worry about syncing your app with its database(s). It also allows you to store data in mediums owned by the user, such as their browser's `localStorage` (where you can't apply migrations arbitrarily).
- Storage and retrieval logic is abstracted into storage engines, which are just functions that return a collection of methods, with no restrictions - like `get()` and `save()`.

You may notice TinyORM is light on constraints. You're not supposed to know what your schema or your storage logic is going to look like. The goal is to give you a simple paradigm that you can build with, starting from a simple foundation.

To get started with TinyORM, check out the following examples:

1. [Specify your first type](./tests/firstType.test.ts)
2. [Update your type and specify a migration](./tests/firstMigration.test.ts)
3. [Create a custom storage engine](./tests/customStorageEngine.test.ts)
4. [Create a higher level storage engine](./tests/higherLevelStorageEngine.ts)

You may have noticed these examples are actually the test suite for this project.

TinyORM's codebase is written to be simple and readable. You shouldn't be afraid to jump into the code and see what's going on for yourself!

## Storage engines

TinyORM ships with these [storage engines](./src/storageEngines), but you can write a custom one too - even by just combining existing ones.

Some reasons you may want to write a custom storage engine could be:

- Using more than one storage medium, such as the browser's `localStorage` for logged out users and a cloud database for logged in users.
- Pre or post processing your objects, such as updating an `updated_at`
  timestamp before saving. Storage engines can constrain the types they handle to include certain fields.

### Higher level storage engines

You can write storage engines that take any kind of extra information by wrapping them in a function.

Storage engines are already a function, so this means it will be a function returning a function (the actual storage engine).

You can then simply call your higher-level storage engine, passing in the intended values, in turn passing the result to your models.

## Type validation

TinyORM is based on typescript and thus doesn't enforce type validation at runtime.

You can use an existing library for this functionality, such as `zod`.

Like other kinds of data pre-processing, it should be implemented at the storage engine level. You can write a custom storage engine with a wrapping function that takes in whatever it needs, then call it and pass the result to your model.

## Tradeoffs

Everything in computer science has tradeoffs, and TinyORM is no exception. These are the ones we get by radically optimizing for simplicity and development speed.

### Migrations

Migrations being applied at data retrieval time avoids having to maintain database specific migration logic and making sure it gets applied at the right time. You no longer have to think about syncing your database's state with your app, as the app now owns that state.

It also means you don't have to control every database you store data on, so you can include mediums owned by the user in your architecture - such as the browser's `localStorage`.

A downside is that you won't know a migration breaks with some specific data until it does, in the hands of a user. You have to set up proper error reporting and fix it when it happens.

Another downside is that your stored data isn't guaranteed to be in the latest format. You can still make assumptions on it, such as assuming it has a `created_at` field for time-based querying, but your storage engine must enforce this assumption by constraining its generic type parameter (with something like `T extends Timestamped`).

### Storage engines

Being database agnostic and placing no restrictions on the methods that a storage engine exposes means you have total flexibility in your storage logic.

You can expose a way for your models to send SQL queries with a `query(sql: string)` or just a `get(id: string)` that retrieves items one at a time.

The downside is that users have to become familiar with the API exposed by a given storage engine, and that switching databases is not a one line change.

## Architecture suggestions

### Separating data per user

This library is entirely focused on the client side and makes no assumptions about your backend.

While you can write a custom engine that interacts with an arbitrary server side API, you may want to consider simplifying your architecture by storing each user's data separately and simply ensuring that a user can only access their own data.

This avoids having to maintain a backend API with complex authorization logic - and perhaps having a backend at all.

If each user holds a key to their data, they can just access it directly.

Public data that should be accessible to multiple users can be stored in a separate, shared location.

### Complex queries may not be necessary

You may not need to expose a complex querying API in your custom storage engine.

Consider allowing your users to keep more of their data on-device and seeing your database as more of a backup, long-term storage.

Keeping querying and processing logic entirely in your client side both simplifies your architecture and leverages the user's device for computation.

## Maintainers

This project uses [bun](https://bun.sh) for dependency management and its build system.

To get started, simply run `bun install`.

To build for production, run `bun run build`. Add `--watch` to watch for changes.

To run tests, run `bun test`. Note tests rely on the built package, so you'll have to run `bun run build:noTest` after making any changes to see them reflected in the tests.

To work on this package while using it in a project, you can link it as a dependency:

```shell
# Run this from this project's directory to register it as a linkable package with bun.
bun link

# Then add the linked package as a dependency in the other project.
cd /path/to/other/project
bun link @hesoyam.zip/tiny-orm
```

To publish a new version of the package to npm, bump the version in `package.json` and run `bun publish`. This will run the `prepublishOnly` script before publishing.
