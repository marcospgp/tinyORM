import { createModel, inMemoryStorageEngine } from "../dist";
import { expect, test } from "bun:test";

test("Defining the first type.", () => {
  // We start by defining our type. For this example we specify a user account.
  type User = {
    username: string;
    email: string;
  };

  // We then create our model.
  const userModel = createModel(
    // The first parameter is a unique name for your model.
    // This is passed along to the storage engine, which relies on it to
    // distinguish models from each other and possibly to optimize storage.
    "user",
    // The second parameter shows how to get a unique ID out of your type.
    // Annotating the type here is enough for typescript to infer it as the one
    // we'll be using for this model.
    (user: User) => user.username,
    // We also specify a storage engine. TinyORM ships with a few, but we'll
    // also see how you can write a custom one.
    inMemoryStorageEngine,
    // Now we can specify what methods our model exposes. A good default to
    // start out with is to simply expose every method provided by the storage
    // engine.
    (storageMethods) => ({ ...storageMethods })
  );

  // We can then simply create objects of our type:
  const user: User = {
    username: "hunter2",
    email: "hunter2@example.com",
  };

  // inMemoryStorageEngine exposes a save() method we can use to store our user:
  userModel.save(user);

  // And a get() method we can use to retrieve them:
  const retrievedUser = userModel.get("hunter2");

  expect(retrievedUser.email).toBe("hunter2@example.com");
});
