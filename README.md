# tinyORM

[![npm version](https://badge.fury.io/js/@hesoyam.zip%2Ftiny-orm.svg)](https://www.npmjs.com/package/@hesoyam.zip/tiny-orm)

A minimal typescript storage layer radically optimized toward development speed.

TinyORM's [core](./src/tinyORM.ts) will never exceed 100 lines of zero-dependency code.

## Install

```shell
npm i @hesoyam.zip/tiny-orm
```

```shell
bun add @hesoyam.zip/tiny-orm
```

```shell
pnpm add @hesoyam.zip/tiny-orm
```

## What is TinyORM?

You're a builder who wants to ship instead of designing the perfect database schema before you get your first user. TinyORM is for you!

These are the core ideas behind it:

- Your schemas are defined as regular typescript types.
- You can update your types at any time by providing a migration, which is just a plain typescript function that updates an object from the previous version to the new one.
- Migrations are applied at retrieval time to bring previously stored data up to date. This means you can cleanly integrate with both databases you control and those you don't (such as the browser's `localStorage`).
- Storage and retrieval logic is abstracted into storage engines, which are just functions that return a collection of methods like `get()` and `save()`.

TinyORM ships with these [storage engines](<(./src/storageEngines)>), but you can write a custom one too - even just by combining existing ones.

Some reasons you may want to write a custom storage engine could be:

- Using the browser's `localStorage` for logged out users and a cloud database for logged in users.
- Pre or post processing your objects, such as updating an `updated_at`
  timestamp before saving.

There are deliberately no restrictions on what methods a storage engine exposes - just like there is no reason to lock down your schema from the start, your storage logic should also remain open to iteration.

To get started with TinyORM, check out the following examples:

1. Specify your first type

https://github.com/marcospgp/tinyORM/blob/main/tests/firstType.test.ts

2. Update your type and specify a migration

3. Create a custom storage engine

You may have noticed these examples are actually the test suite for this project.

TinyORM's codebase is written to be simple and readable. You shouldn't be afraid to jump into the code and see what's going on for yourself!

## Tradeoffs

Everything in computer science has tradeoffs, and TinyORM is no exception. These are the ones we get by radically optimizing for simplicity and development speed.

### Migrations

Migrations being applied at data retrieval time avoids having to maintain database specific migration logic, applying it separately all at once, and risking affecting all your data with a buggy migration.

It also means you don't have to control the database, so you can include mediums owned by the user in your architecture - such as the browser's `localStorage`.

The downside is that you won't know a migration breaks with some specific data until it does, in the hands of a user. You have to set up proper error reporting and fix it when it happens.

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

To work on this package while using it in a project, you can link it as a dependency:

```shell
# Run this from this project's directory to register it as a linkable package with bun.
bun link

# Then add the linked package as a dependency in the other project.
cd /path/to/other/project
bun link @hesoyam.zip/tiny-orm
```

To publish a new version of the package to npm, bump the version in `package.json` and run `bun publish`. This will run the `prepublishOnly` script before publishing, which builds the library into `./dist/`.
