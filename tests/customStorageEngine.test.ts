import {
  createModel,
  inMemoryStorageEngine,
  type StorageEngineParams,
} from "../dist";
import { expect, test } from "bun:test";
import type { RecursiveFunctionDict } from "../src";

test("Building a custom storage engine.", () => {
  // One of the main strengths of TinyORM is that it is database agnostic.
  // You can write a custom storage engine for any storage medium, or even one
  // that mixes together other storage engines.
  // For this example we'll write a storage engine that enforces "createdAt"
  // and "updatedAt" timestamps in the objects it handles.
  // Enforcing the presence of certain fields allows a storage engine to query
  // against them.
  // You should always enforce timestamps, even if you won't need to query
  // against them right away - you can't change a storage engine's type
  // constraint after having stored some data, as it can cause issues when
  // retrieving it.

  // We start by creating a type that encodes the assumptions we want to be able
  // to make about our objects.
  type Timestamped = {
    /** ISO timestamp. */
    _createdAt: string;
    /** ISO timestamp. */
    _updatedAt: string;
  };

  // We then create our storage engine.
  // A storage engine is just a generic function that gets passed in when
  // creating a model. It gets called by the model with a set of parameters that
  // it can use to define a set of methods. Those methods are then what you
  // receive in the function that defines what methods a model will have.

  // Storage engines define a generic type parameter, in this example called T.
  // This type will be set by the model using this storage engine.
  // For now, we don't know what model will be using it, nor with which type -
  // so we use type T to represent that not yet defined type.
  // We specify Timestamped as a constraint on the generic type, which will
  // force models to include the fields we defined earlier.

  function timestampedStorageEngine<T extends Timestamped>(
    // Storage engines receive a StorageEngineParams<T> object as their only
    // parameter.
    // Using that type to annotate the objects allows us to skip annotating
    // each field.
    {
      // The name of the model that is trying to use this storage engine.
      modelName,
      // The current version of that model.
      currentVersion,
      // A function that returns a unique ID given an object of type T (the type
      // which the model will specify when using this storage engine).
      getId,
      // A function that brings an object to the latest version of this model's
      // schema.
      // A storage engine must always pass a previously stored object through
      // this function before returning it.
      migrate,
    }: StorageEngineParams<T>
  ) {
    // This storage engine will actually rely on an existing one to store its
    // data.
    // You can rely on one, many, or write all your storage logic from scratch!
    const engine = inMemoryStorageEngine({
      modelName,
      currentVersion,
      getId,
      migrate,
    });

    // A storage engine must return a RecursiveFunctionDict, which is just an
    // object where each field is either a function or another
    // RecursiveFunctionDict.
    return {
      ...engine,
      save(...objs: T[]) {
        // This engine just updates the "updatedAt" timestamp before letting
        // the in-memory storage engine save the data.
        engine.save(
          ...objs.map((x) => ({ ...x, _updatedAt: new Date().toISOString() }))
        );
      },

      // You don't have to include this, but it helps ensure your code stays
      // correct.
      // Don't use a type annotation or assertion instead of "satisfies", as
      // tinyORM relies on the return type inferred by typescript!
    } satisfies RecursiveFunctionDict;
  }

  // We can now define a type:
  type User = {
    username: string;
    email: string;
    // Note that if we remove these fields, our model definition will error
    // below - because this type will not meet the storage engine's constraint.
    _createdAt: string;
    _updatedAt: string;
  };

  // And a model that uses that type and our custom engine:
  const timestampedUserModel = createModel(
    "user",
    (x: User) => x.username,
    timestampedStorageEngine,
    (storageMethods) => ({ ...storageMethods })
  );

  const startingTimestamp = new Date(1990, 0, 1).toISOString();

  timestampedUserModel.save({
    username: "hunter2",
    email: "hunter2@example.com",
    _createdAt: startingTimestamp,
    _updatedAt: startingTimestamp,
  });

  const storedUser = timestampedUserModel.get("hunter2");

  expect(storedUser._updatedAt).not.toBe(startingTimestamp);
});
