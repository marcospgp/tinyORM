import { StorageEngineParams } from "../dist";
import { expect, test } from "bun:test";
import { createModel } from "../src";

type Dict = Record<string, any>;

test("Building a custom storage engine.", () => {
  // You may want your storage engines to include functionality that requires
  // passing in custom parameters related to your model.
  // For example, you may want to validate your objects using a library such as
  // zod.
  // Here we'll use a simple validating function as an example.

  // We can pass arbitrary values to a storage engine by wrapping it in a parent
  // function:
  function createValidatingStorageEngine<T extends Dict>(
    validate: (obj: T) => boolean
  ) {
    // We simply return our actual storage engine from inside the wrapping
    // function.
    return function validatingStorageEngine(_: StorageEngineParams<T>) {
      return {
        save(...objs: T[]) {
          for (const obj of objs) {
            // Any values passed to that function are now in scope.
            // Here, we run the model-specific validation function.
            if (!validate(obj)) {
              throw new Error("Object failed validation!");
            }
          }

          // The rest of your object saving logic would go here.
        },
      };
    };
  }

  type User = {
    username: string;
    email: string;
  };

  // To get a valid storage engine we simply call the wrapping function, passing
  // in the intended values.
  const userEngine = createValidatingStorageEngine(
    (user: User) => user.username !== ""
  );

  // We then pass the engine when creating our model.
  const userModel = createModel("user", (user) => user.username, userEngine);

  expect(() => {
    // We should expect this save call to fail as this user does not pass
    // our validation logic.
    userModel.save({ username: "", email: "something@example.com" });
  }).toThrow();
});
