# tinyORM

A minimal storage layer radically optimized toward development speed.

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

You just specify a data type and how you want to store it:

```typescript
import {
  BaseModel,
  createModel,
  localStorageEngine,
} from "@hesoyam.zip/tiny-orm";

type User = BaseModel & {
  username: string;
};

const userModel = createModel<[User]>(
  (user) => user.username, // Show how to get a unique ID out of your type.
  localStorageEngine // Store data in the browser's localStorage.
);

// You then simply create objects of your type as usual:
const myUser: User = {
  version: userModel.version,
  username: "myUser",
};

// Use the model to persist them:
userModel.save(myUser);

// And retrieve them at any time:
const myUser = userModel.get("myUser");
```

Note that the data itself is not part of the model - you create plain objects separately and pass them in to your model's methods as required.

This makes tinyORM integrate seamlessly with libraries like React, where storing state requires plain objects.

### Migrations

You may have noticed we used a `BaseModel` type to base our own model on. All that this base type adds is a `version: number` field.

Versioning your data types allows you to change them at any time without breaking production - you just have to tell TinyORM how to migrate existing data from the previous version to the new one.

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
  role: "member" | "admin";
};

type User = UserV2;

const userModel = createModel<[User]>(
  (user) => user.username,
  localStorageEngine,
  // We now specify our first migration to createModel().
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

### Storage engines

TinyORM ships with a `localStorage` and a postgreSQL storage engine, but you can build a custom one - even just by mixing together existing ones. To do so, you just need a function that takes in two arguments:

- A function that given an object will return its ID
- A migrate function that brings an object to the latest data type

You may have noticed both the ID function and the migrations are passed in by the user to the `createModel()` function.
This function just passes these along to the storage engine, wrapping migrations into a single function for ease of implementation.

The storage engine function should then return a collection of methods, with no restrictions. The only thing it has to keep in mind is to always run an object through the migrate function after retrieving it, to make sure no data is ever returned in an outdated format.

```typescript
// The storage engine function can access the type of object it is going to be storing through the
// generic parameter T.
// You can call this parameter anything you want, but it should always extend BaseModel, which ensures it has
// a version field.
function timestampedLocalStorageEngine<T extends BaseModel>(
  getId: (obj: T) => string,
  migrate: (prev: Record<string, unknown>) => T
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

To publish a new version of the package to npm, bump the version in `package.json` and run `bun publish`.
