# tinyORM

A minimal storage layer radically optimized toward development speed.

## Install

TODO

## What is TinyORM?

You're a builder who wants to ship instead of designing the perfect database schema before you get your first user. TinyORM is for you!

You just define a data type and specify how you want to store it:

```typescript
import { createModel, localStorageEngine } from "@hesoyam.zip/tiny-orm";

type User = {
  // "version" is the only field required by TinyORM.
  // It makes it possible to run migrations on older data.
  version: number;
  username: string;
};

const userModel = createModel<[User]>(
  // You just have to show TinyORM how to get a unique ID out of your data type.
  (user) => user.username,
  // And to specify where you want data to be stored.
  localStorageEngine
);

// You can then create objects at will.
const myUser: User = {
  version: userModel.version,
  username: "myUser",
};

// Persist them.
userModel.save(myUser);

// And retrieve them at any time.
const myUser = userModel.get("myUser");
```

```typescript
import { createModel, localStorageEngine } from "@hesoyam.zip/tiny-orm";

type User = {
  // "version" is the only field required by TinyORM.
  // It makes it possible to run migrations on older data.
  version: number;
  username: string;
};

const userModel = createModel<[User]>(
  // The first parameter is just showing how to get a unique ID out of your data type.
  (user) => user.username,
  // In the second parameter you can specify any utility methods you'd like to be appended to your model.
  // These can be anything.
  {
    capitalizeUsername(user: User) {
      return user.username.toUpperCase();
    },
  },
  // The third parameter is a list of migrations. These are just functions that update your objects
  // from one version of your schema to the next, which you provide whenever you update your schema.
  // They are applied automatically when retrieving data, so you don't have to worry about running them separately.
  [
    (prev) => ({
      ...prev,
      history: [],
    }),
  ],
  // The fourth and final parameter is the storage engine.
  // Storage engines are just a bunch of methods that get appended to your model. Most commonly you'll have ones like `get()` and `save()`, but they can be anything.
  localStorageEngine
);
```

Note that the data itself is not part of the model - you create plain objects separately and pass them in to your model's methods as required.
This makes tinyORM integrate seamlessly with libraries like React, where storing state requires plain objects.

### Storage engines

TinyORM ships with a `localStorage` and a postgreSQL storage engine, but you can build a custom one, even just by mixing together existing ones. To define a custom storage engine, you just need a function that takes in two arguments:

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

### Migrations

TODO

## Maintainers

This project uses [bun](bun.sh) for dependency management and its build system.

To get started, simply run `bun install`.

To build for production, run `bun run build`.

To work on this package while using it in a project, you can link it as a dependency:

```shell
# Run this from this project's directory to register it as a linkable package with bun.
bun link

# Then add the linked package as a dependency in the other project.
cd /path/to/other/project
bun link @hesoyam.zip/tiny-orm
```

To publish a new version of the package to npm, bump the version in `package.json` and run `bun publish`.
