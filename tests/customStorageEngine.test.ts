import {
  createModel,
  inMemoryStorageEngine,
  StorageEngineParams,
} from "../dist";
import { expect, test } from "bun:test";

test("Building a custom storage engine.", () => {
  // One of the main strengths of TinyORM is that it is database agnostic.
  // You can write a custom storage engine for any storage medium, or even one
  // that mixes together other storage engines.
  // For this example, we will write a storage engine that enforces "created_at"
  // and "updated_at" timestamps in stored objects.
  // Enforcing the presence of certain fields makes it possible for a storage
  // engine to query against them (even though we won't do that in this
  // example).
  // You should always enforce timestamps, even if won't need to query against
  // them immediately - you can't change a storage engine's type constraint
  // later, as it can cause issues when retrieving previously stored data.

  // We start by creating a type that encodes the assumptions we want to be able
  // to make about our objects.
  type Timestamped = {
    /** ISO timestamp. */
    created_at: string;
    /** ISO timestamp. */
    updated_at: string;
  };

  // We then create our storage engine.
  // A storage engine is just a generic function that can be passed into a
  // model, which then calls it with some model-specific parameters and appends
  // the resulting set of methods to itself.
  // There are no restrictions on what the methods returned by a storage engine
  // look like.

  // We specify Timestamped as a constraint on the generic type. The minimum
  // constraint is Record<string, any>.
  // The storage engine receives a StorageEngineParams<T> object from the model
  // that is going to use it.
  function timestampedStorageEngine<T extends Timestamped>({
    // The name of the model that is trying to use this storage engine.
    modelName,
    // The current version of that model.
    modelVersion,
    // A function that returns a unique ID given an object of type T (our
    // generic parameter).
    getId,
    // A function that updates a previously stored object to the latest version,
    // compatible with type T.
    // A storage engine must always call this function before returning any
    // data.
    migrate,
  }: StorageEngineParams<T>) {
    // This storage engine will actually rely on an existing one to store its
    // data.
    // It just adds some functionality on top of it.
    const engine = inMemoryStorageEngine({
      modelName,
      modelVersion,
      getId,
      migrate,
    });

    return {
      ...engine,
      save(...objs: T[]) {
        engine.save(
          ...objs.map((x) => ({ ...x, updated_at: new Date().toISOString() }))
        );
      },
    };
  }

  // We can now define a type:
  type User = {
    username: string;
    email: string;
    // Note that if we remove these fields, our model definition will error
    // below - because this type will not meet the storage engine's constraint.
    created_at: string;
    updated_at: string;
  };

  // And a model that uses that type and our custom engine:
  const timestampedUserModel = createModel(
    "user",
    (x: User) => x.username,
    timestampedStorageEngine
  );

  const startingTimestamp = new Date(1990, 0, 1).toISOString();

  timestampedUserModel.save({
    username: "hunter2",
    email: "hunter2@example.com",
    created_at: startingTimestamp,
    updated_at: startingTimestamp,
  });

  const storedUser = timestampedUserModel.get("hunter2");

  expect(storedUser.updated_at).not.toBe(startingTimestamp);
});
