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
    (storageMethods) => ({ ...storageMethods }),
    // The fifth parameter is a list of migrations.
    // It's important to include the proper type annotations here - they'll help
    // catch most issues.
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
  // The storage engine infers your model's current version from how many
  // migrations you've passed in, and stores that version alongside each object.
  // It then uses that information to apply the correct migrations when
  // retrieving that data.

  // Make sure to always keep your migrations deterministic! Even if your
  // storage engine re-stores outdated objects right after migrating them (which
  // would slow down your reads), your app would still be prone to concurrency
  // issues with multiple simultaneous fetches for the same outdated data.
});
