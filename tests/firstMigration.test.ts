import { createModel, inMemoryStorageEngine } from "../dist";
import { test } from "bun:test";

test("Writing the first migration.", () => {
  // We can now move on to writing our first migration.

  // We start with the same user type as in the previous example.
  // Since we'll now have more than one user type, we'll add a V1 suffix.
  type UserV1 = {
    username: string;
    email: string;
  };

  // Let's imagine that users are now supposed to have physical addresses
  // instead of emails. We thus define a new type:
  type UserV2 = Omit<UserV1, "email"> & {
    address: string;
  };

  // Note how we used typescript's Omit to remove fields from an existing type,
  // which lets us avoid repeating the previous version's fields.

  // We can now alias our User type to this latest version:
  type User = UserV2;

  // Now when creating our model, we specify a migration showing how a UserV1
  // can be updated into a UserV2:
  createModel(
    "user",
    (user: User) => user.username,
    inMemoryStorageEngine,
    () => ({}),
    // The fifth parameter is a list of migrations.
    // Including the proper type annotations helps ensure the migration is
    // valid.
    [
      (prev: UserV1): UserV2 => {
        // Remove email field.
        const { email: _, ...rest } = prev;
        // Add address field.
        return { ...rest, address: "unknown" };
      },
    ]
  );

  // Remember that migrations are applied at retrieval time, so this new model
  // has no effect until you load data and save it again.
  // The storage engine applies any migrations needed to get your data to the
  // latest version as it retrieves it.
  // It knows which migrations to apply by storing the model's version alongside
  // the object.
});
