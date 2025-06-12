import { BaseModel, createModel, inMemoryStorageEngine } from "dist";
import { expect, test } from "bun:test";

test("Writing the first migration.", () => {
  // We can now move on to writing our first migration.

  // Say we have the same user type as in the previous example (note we have
  // renamed it "UserV1" instead of just "User"):
  type UserV1 = BaseModel & {
    username: string;
    email: string;
  };

  // But now users are supposed to have physical addresses instead of emails.
  // So we can define a new type:
  type UserV2 = Omit<UserV1, "email"> & {
    address: string;
  };

  // We can alias our User type to this latest version:
  type User = UserV2;

  // Now when creating our model we have to specify how a UserV1 can be turned
  // into a UserV2:
  const userModel = createModel(
    "user",
    (user: User) => user.username,
    inMemoryStorageEngine,
    {},
    // The fifth parameter is a list of migrations.
    // Pay attention to the type annotations, as they are really helpful in
    // ensuring your migrations are correct.
    [
      (prev: UserV1): UserV2 => {
        const { email: _, ...rest } = prev;
        return { ...rest, address: "unknown" };
      },
    ]
  );

  // We start by defining our type. For this example we specify a user account.
  // Basing it on BaseModel just adds a "version: number" field, which enables
  // migrations.
  type User = BaseModel & {
    username: string;
    email: string;
  };

  const userModel = createModel(
    // The first parameter is a unique name for your type.
    // This allows storage engines to distinguish between different models, even
    // with overlapping IDs.
    "user",
    // The second parameter shows TinyORM how to get a unique ID out of your
    // type.
    // Annotating the type here is enough for typescript to infer it as the one
    // we'll be using for this model.
    (user: User) => user.username,
    inMemoryStorageEngine
  );

  // You then simply create objects of your type.
  // Your data is always a plain object, so you can just use it with libraries
  // that expect that format - such as React's useState() hook.
  const user: User = {
    version: userModel.version, // Get current version number from the model.
    username: "hunter2",
    email: "hunter2@example.com",
  };

  // To persist an object, use a method exposed by your selected storage engine:
  userModel.save(user);

  // Same for retrieving it:
  const retrievedUser = userModel.get("hunter2");

  expect(retrievedUser.email).toBe("hunter2@example.com");

  // We can also add helper methods to our models:
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

  // We can then call our utility method:
  const domain = userModel2.getEmailDomain(user);

  expect(domain).toBe("example.com");
});
