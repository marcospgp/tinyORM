import { createModel, inMemoryStorageEngine } from "../dist";
import { expect, test } from "bun:test";

test("Defining the first type.", () => {
  // We start by defining our type. For this example we specify a user account.
  type User = {
    username: string;
    email: string;
  };

  const userModel = createModel(
    // The first parameter is a unique name for your type.
    // This allows storage engines to avoid issues with overlapping IDs across
    // different models, and possibly to optimize storage.
    "user",
    // The second parameter shows how to get a unique ID out of your type.
    // Annotating the type here is enough for typescript to infer it as the one
    // we'll be using for this model.
    (user: User) => user.username,
    // We also specify a storage engine. TinyORM ships with a few, but we'll
    // also see how you can write a custom one.
    inMemoryStorageEngine
  );

  // Your model works with regular objects of the type you specified.
  // This means you can use them for anything that expects a plain object, such
  // as React's useState() hook.
  const user: User = {
    username: "hunter2",
    email: "hunter2@example.com",
  };

  // To persist an object, use a method exposed by your selected storage engine.
  // inMemoryStorageEngine exposes .save():
  userModel.save(user);

  // Retrieving an object also relies on a method exposed by the storage engine.
  // inMemoryStorageEngine exposes .get():
  const retrievedUser = userModel.get("hunter2");

  expect(retrievedUser.email).toBe("hunter2@example.com");

  // We can also add helper methods to our models.
  // Let's create a new model for our User type with a helper method:
  const userModel2 = createModel(
    "user",
    (user: User) => user.username,
    inMemoryStorageEngine,
    // The third parameter specifies any methods we want to attach to the model.
    {
      getEmailDomain(user: User) {
        return user.email.split("@")[1] || "";
      },
    }
  );

  // We can then call our utility method.
  // Models expose type hints correctly for both utility methods and the methods
  // exposed by the specified storage engine, so your editor should be able to
  // show you what's available.
  const domain = userModel2.getEmailDomain(user);

  expect(domain).toBe("example.com");
});
