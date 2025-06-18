import {
  createModel,
  inMemoryStorageEngine,
  type StorageEngineParams,
} from "../dist";
import { expect, test } from "bun:test";

test("Building a custom storage engine.", () => {
  // One of the main strengths of TinyORM is that it is database agnostic.
  // You can write a custom storage engine for any storage medium, or even one
  // that mixes together other storage engines.
  // For this example, we will write a storage engine that enforces "createdAt"
  // and "updatedAt" timestamps in stored objects.
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
    createdAt: string;
    /** ISO timestamp. */
    updatedAt: string;
  };

  // We then create our storage engine.
  // A storage engine is just a generic function that can be passed into a
  // model, which then calls it with some model-specific parameters and appends
  // the resulting set of methods to itself.
  // When a model uses a storage engine, type T is set to the same type used
  // by the objects of that model.
  // A storage engine should always use the type T to annotate received and
  // returned objects of the model's type.

  // We specify Timestamped as a constraint on the generic type. The minimum
  // constraint is Record<string, any>.
  // The storage engine receives a StorageEngineParams<T> object from the model
  // that is going to use it.
  function timestampedStorageEngine<T extends Timestamped>({
    // The name of the model that is trying to use this storage engine.
    modelName,
    // The current version of that model.
    currentVersion,
    // A function that returns a unique ID given an object of type T (our
    // generic parameter).
    getId,
    // A function that updates a previously stored object to the latest version,
    // compatible with type T.
    // A storage engine must always call this function before returning any
    // data.
    // We don't call it in this example as we just rely on the in-memory storage
    // engine, but check out the source code for the included storage engines
    // to see how they work!
    migrate,
  }: StorageEngineParams<T>) {
    // This storage engine will actually rely on an existing one to store its
    // data.
    // It just adds some functionality on top of it.
    const engine = inMemoryStorageEngine({
      modelName,
      currentVersion,
      getId,
      migrate,
    });

    // There are no restrictions on what the methods returned by a storage engine
    // look like.
    return {
      ...engine,
      save(...objs: T[]) {
        // This engine just updates the "updatedAt" timestamp before letting
        // the in-memory storage engine save the data.
        engine.save(
          ...objs.map((x) => ({ ...x, updatedAt: new Date().toISOString() }))
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
    createdAt: string;
    updatedAt: string;
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
    createdAt: startingTimestamp,
    updatedAt: startingTimestamp,
  });

  const storedUser = timestampedUserModel.get("hunter2");

  expect(storedUser.updatedAt).not.toBe(startingTimestamp);
});
