# tinyORM

A minimal storage layer extremely optimized toward development speed.

## What is TinyORM?

You're a builder who wants to ship instead of designing the perfect database schema before you get your first user. TinyORM is for you!

You just define a data type and specify how you want to store it:

```typescript
import { createModel, localStorageEngine } from "@hesoyam.zip/tiny-orm";

type User = {
  // version is the only required field.
  // it lets you update your data types at any time without breaking production!
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
  // The third parameter is a list of migrations.
  // This is empty for now, but you'll be adding one whenever you want to update your data type without breaking production.
  // Migrations are applied by the storage engine whenever data is retrieved, always at runtime.
  // You'll never have to do world-stopping migrations in a language other than your app is written in.
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
This makes tinyORM integrate seamlessly with libraries like React, where plain objects are required when storing data in state.

TinyORM ships with a `localStorage` and a postgreSQL storage engine, but you can build a custom one, even just by mixing together existing ones!

```typescript
type User = {
  version: number;
  name: string;
};
```

(the only requirement is that you include a `version: number` field, which enables migrations)

You can then create a model out of it by specifying how it should be stored:

```typescript
export const projectModel = createModel<[ProjectV1, ProjectV2]>(
  (obj: Project) => obj.id,
  {
    getSomething(x: number) {
      return x * 2;
    },
  },
  [
    (prev) => ({
      ...prev,
      history: [],
    }),
  ],
  localStorageEngine
);
```

If you want to update a model without breaking production,

You can store your objects in `localStorage`, an SQL database, or on a stone tablet - tinyORM doesn't care.

TinyORM ships with a `localStorage` storage engine, and there is a postgresql one shipping soon. You can easily define a custom one, even by simply mixing together already existing ones!

For each type of object you want to store

All you define is a model for your data, like:

```typescript
type Project = {
  version: number;
  id: string;
  name: string;
  history: {
    goal: string;
    secondsElapsed: number;
    outcome: "DEFUSED" | "DETONATED" | "EXPLODED";
  }[];
};
```

The only requirement is that you include a `version: number` field.

## Install
