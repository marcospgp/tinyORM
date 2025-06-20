import { createModel, inMemoryStorageEngine } from "../dist";
import { expect, test } from "bun:test";

test("Adding utility methods.", () => {
  type User = {
    username: string;
    email: string;
  };

  // We can also add helper methods to our models.
  // Let's create a new model for our User type with a helper method:
  const userModel = createModel(
    "user",
    (user: User) => user.username,
    inMemoryStorageEngine,
    // The fourth parameter to createModel() is a function that receives the
    // methods exposed by the storage engine and returns any utility methods
    // that should be attached to the model.
    // Your utility methods don't have to rely on the storage methods, but they
    // can.
    (_) => ({
      getEmailDomain: (user: User) => user.email.split("@")[1] || "",
    })
  );

  const user: User = {
    username: "hunter2",
    email: "hunter2@example.com",
  };

  // You can call utility methods directly on the model.
  // Models expose type hints correctly for both utility methods and the methods
  // exposed by the specified storage engine, so your editor should be able to
  // show you what's available.
  const domain = userModel.getEmailDomain(user);

  expect(domain).toBe("example.com");

  // You can also use utility methods to expose reducer-style functionality,
  // which fits well with a functional-friendly library like React.

  type UserAction =
    | { type: "SET_EMAIL"; email: string }
    | { type: "CLEAR_EMAIL" };

  const userModel2 = createModel(
    "user",
    (user: User) => user.username,
    inMemoryStorageEngine,
    (storage) => ({
      // Naming this method "persist" makes it clear that it writes to the
      // database in addition to returning a value.
      persist: (user: User, action: UserAction): User => {
        let newUser: User;
        if (action.type === "SET_EMAIL") {
          newUser = {
            ...user,
            email: action.email,
          };
        } else if (action.type === "CLEAR_EMAIL") {
          newUser = {
            ...user,
            email: "",
          };
        } else {
          throw Error(
            `Unknown action for User model: ${JSON.stringify(action)}`
          );
        }

        storage.save(newUser);
        return newUser;
      },
    })
  );

  const newUser = userModel2.persist(user, { type: "CLEAR_EMAIL" });

  expect(newUser.email).toBe("");

  const retrievedUser = userModel2.get("hunter2");

  expect(retrievedUser.email).toBe("");
});
