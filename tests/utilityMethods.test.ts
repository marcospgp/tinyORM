import { createModel, inMemoryStorageEngine } from "../dist";
import { expect, test } from "bun:test";

test("Adding utility methods.", () => {
  type User = {
    username: string;
    email: string;
  };

  // Models can expose any set of methods, and don't have to expose all or even
  // any of those provided by the storage engine. This means you can, for
  // example, constrain your storage code to follow a given convention - such as
  // React's reducer approach (except not as pure, given that storing data
  // introduces a side effect).

  type UserAction =
    | { type: "CREATE" }
    | { type: "SET_EMAIL"; email: string }
    | { type: "CLEAR_EMAIL" };

  const userModel = createModel(
    "user",
    (user: User) => user.username,
    inMemoryStorageEngine,
    (storageMethods) => ({
      // This model only exposes a persist() method for storing data.
      // We name it "persist" instead of the conventional "dispatch" in order to
      // make it explicit that it writes to the database in addition to
      // returning a value.
      persist: (user: User, action: UserAction): User => {
        let newUser: User;
        if (action.type === "CREATE") {
          newUser = { ...user };
        } else if (action.type === "SET_EMAIL") {
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

        storageMethods.save(newUser);
        return newUser;
      },

      // We still expose a data retrieval method from the storage engine.
      get: storageMethods.get,
    })
  );

  // We can now create a user through the method we exposed in the model:
  let user = userModel.persist(
    {
      username: "hunter2",
      email: "hunter2@example.com",
    },
    { type: "CREATE" }
  );

  expect(user.email).toBe("hunter2@example.com");

  user = userModel.persist(user, { type: "CLEAR_EMAIL" });

  expect(user.email).toBe("");

  const retrievedUser = userModel.get("hunter2");

  expect(retrievedUser.email).toBe("");
});
