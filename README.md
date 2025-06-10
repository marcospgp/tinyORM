# tinyORM

[![npm version](https://badge.fury.io/js/@hesoyam.zip%2Ftiny-orm.svg)](https://badge.fury.io/js/@hesoyam.zip%2Ftiny-orm)

A minimal typescript storage layer radically optimized toward development speed.

TinyORM's [core](./tinyORM.ts) will never exceed 100 lines of zero-dependency code.

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

- Your schemas are just defined as regular typescript types.
- Whenever you want to update a type, you create a new version of it and tell TinyORM how it can migrate the previous version to it.
- Migrations are just plain typescript functions, and are applied at data retrieval time. There are no world-stopping migrations in a database-specific language.
- TinyORM is database agnostic. It ships with `localStorage` and postgreSQL storage engines, but you can store your data anywhere by writing a custom one. A storage engine is just a function that returns a collection of methods like `get()` and `save()`.

To get started, check out the following examples:

1. Specify your first type
2. Update your type and specify a migration
3. Create a custom storage engine












### Migrations

You may have noticed we used a `BaseModel` type to base our own model on. All that this does it add a `version: number` field.

This allows you to update your model at any time without breaking production - you just have to tell TinyORM how to migrate existing data from the previous version to the new one.

Let's add a role field to our user, which we want to default to "member":

```typescript
import {
  BaseModel,
  createModel,
  localStorageEngine,
} from "@hesoyam.zip/tiny-orm";

// We keep our previous type around so we can type our migration function properly.
type UserV1 = BaseModel & {
  username: string;
};

type UserV2 = UserV1 & {
  username: string;
  role: "member" | "admin"; // The new field.
};

type User = UserV2;
type UserVersions = [UserV1, UserV2];

const userModel = createModel<UserVersions>(
  (user) => user.username,
  localStorageEngine,
  // We now specify our first migration to createModel().
  // It just sets the user's role to "member" as a default.
  [
    (prev: UserV1): UserV2 => ({
      ...prev,
      role: "member",
    }),
  ]
);

const admin: User = {
  version: userModel.version, // userModel.version will now be 2.
  username: "administrator",
  role: "admin",
};
```

Now whenever you retrieve a v1 user, TinyORM will automatically apply your migration to bring them up to v2.

Migrations are always applied at data retrieval time, so there are no world-stopping migrations written in database-specific dialects. Everything happens in your app code.

This also means you can rely on storage mediums you don't control, such as the browser's `localStorage`.

If you get something wrong and a migration fails with some existing data, you can just update the migration to handle that scenario properly.

If you want to remove a field from your type, you don't have to define the new one from scratch - you can use typescript's `Omit` helper:

```typescript
// Rename "role" field to "group".
type UserV3 = Omit<UserV2, "role"> & {
  group: "member" | "admin";
};
```

### Storage engines

One of the main strengths of TinyORM is that it is database agnostic. You can write a custom storage engine that mixes together multiple ones - such as storing data in `localStorage` for guest users, and in a postgreSQL database for logged in ones.

TinyORM ships with a [`localStorage`](./storageEngines/localStorage.ts) and a postgreSQL (coming soon!) storage engine out of the box.

A storage engine is just a function that receives two parameters:

- A function that given an object will return its ID
- A migrate function that brings an object up to the latest version of its data type

Both of these are defined by the user for a given data type.

The storage engine function then uses these to return a collection of methods that handle the storage and retrieval of data.

```typescript
// The storage engine function can access the type of object it is going to be storing through the
// generic parameter T.
// You can call this parameter anything you want, but it should always extend BaseModel, which ensures it has
// a version field.
function timestampedLocalStorageEngine<T extends BaseModel>(
  getId: (obj: T) => string,
  migrate: (prev: BaseModel) => T
) {
  const ls = localStorageEngine(getId, migrate);

  return {
    // This custom storage engine mostly just exposes functionality from the existing localStorageEngine.
    ...ls,
    // We do however override the save method with one that logs a timestamp.
    save(obj: T) {
      obj["updated_at"] = new Date().toISOString();

      ls.save(obj);
    },
  };
}
```

The only thing a storage engine has to keep in mind is to always run an object through the migrate function after retrieving it, to make sure no data is ever returned in an outdated format. The exception is when it is relying on another storage engine, which should already be taking care of that.

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
