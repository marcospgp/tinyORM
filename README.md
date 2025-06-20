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
1. [Add utility methods](./tests/utilityMethods.test.ts)
1. [Update your type and specify a migration](./tests/firstMigration.test.ts)
1. [Create a custom storage engine](./tests/customStorageEngine.test.ts)
1. [Create a higher level storage engine](./tests/higherLevelStorageEngine.test.ts)

These examples are actually test files, which get run before every release - ensuring the code is always up to date.

TinyORM's codebase is written to be simple and readable. You shouldn't be afraid to jump into the code and see what's going on for yourself!

## Storage engines

TinyORM ships with these [storage engines](./src/storageEngines), but you can write a custom one too - even just by combining existing ones.

Some reasons you may want to write a custom storage engine could be:

- Using more than one storage medium, such as the browser's `localStorage` for logged out users and a cloud database for logged in users.
- Pre or post processing your objects, such as updating an `updated_at` timestamp before saving.
- Querying: storage engines can rely on and query against any fields that it constrains models using it to include.

The included storage engines should be a good reference when writing a custom one.

## FAQ

### Why are migration applied at retrieval time?

Migrations being applied at data retrieval time avoids having to maintain database specific migration logic and making sure it gets applied at the right time. You no longer have to think about syncing your database's state with your app, as the app now owns that state.

It also means you don't have to control every database you store data on, so you can include mediums owned by the user in your architecture - such as the browser's `localStorage`.

The tradeoff is that you won't know a migration breaks with some specific data until it does, in the hands of a user. You have to set up proper error reporting and fix it when it happens.

### Can I still query my data?

TinyORM doesn't expose yet another querying API for you to learn. The only way to query your data at the database level is through your storage engine.

A storage engine can force objects to include certain fields by constraining its generic type (with `T extends ConstrainedType`). For example, you should always enforce timestamp fields (such as `_created_at` and `_updated_at`) unless there's a good reason not to.

Your storage engine can then rely on and expose querying functionality for any fields it enforces.

Note that you can't migrate your storage engine, so these fields have to be set from the start of your project. Modifying them may cause your storage engine to break when retrieving previously stored data.

More granular data filtering and processing can still be done on your client side, which has several benefits:

- No database-specific querying languages
- All of your data processing logic is plain typescript
- Processing happens on the user's device (less demand for server compute)

### Why is there no fixed API for storage engines?

TinyORM is maximally flexible and acts as a simple foundation that you can build upon.

It does not enforce a fixed storage engine API because it doesn't know where or how storage engines will store data.

Storage mediums can vary radically - from simple key-value stores to SQL and vector databases - and so can storage engines and the methods they expose.

The tradeoff is that switching storage engines may not be a one-line change, but in most advanced scenarios you are likely to be implementing your own already.

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
