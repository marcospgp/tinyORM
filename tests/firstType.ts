import { BaseModel, createModel, localStorageEngine } from "dist";

/**
 * You just specify a data type and how you want to store it:

```typescript

```

Note that the data itself is not part of the model - you create plain objects separately and pass them in to your model's methods as required.

This makes tinyORM integrate seamlessly with libraries like React, where storing state requires plain objects.
 */

// We start by defining our type. For this example we specify a user account.
// Basing it on BaseModel just adds a "version: number" field, which enables you to update your
// type at any time without worrying about previously stored data.
type User = BaseModel & {
  username: string;
};

// We pass all our datatype's versions to createModel() so our migrations can have proper typing.
// Right now that's just one.
// type UserVersions = [User];

const userModel = createModel(
  (user: User) => user.username, // Show how to get a unique ID out of your type.
  localStorageEngine // Store data in the browser's localStorage.
);

// You then simply create objects of your type.
// This makes them integrate cleanly with any library that expects plain objects, such as React's
// `useState()` hook.
const myUser: User = {
  version: userModel.version,
  username: "myUser",
};

// To persist data, use a method exposed by your selected storage engine:
userModel.save(myUser);

// Same for retrieving it:
const myUser = userModel.get("myUser");
