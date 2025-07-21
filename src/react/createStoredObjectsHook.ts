import { useCallback, useEffect, useState } from "react";

const defaultCacheMaxAgeSeconds = process.env.NODE_ENV === "development" ? 30 : 5 * 60;

/**
 * Hook factory to create hooks for storage models.
 * The resulting hooks allow components to use stored objects in their state.
 *
 * Feel free to copy and paste the following documentation comment into the
 * resulting hook function:
 *
/**
 * (This comment was copied from the definition for createStoredObjectsHook())
 *
 * Use objects in state, triggering a rerender if any other component updates
 * them.
 *
 * You can pass in:
 *
 * - nothing to get all objects
 * - a filter function to get a subset of all objects (this still fetches all
 *   objects, but avoids unnecessary rerenders by filtering out those the
 *   component doesn't care about)
 * - a list of object IDs (this avoids fetching all objects)
 * - TODO: limit fetch range by dates.
 *
 * The single object version is the same except you can only pass in a single ID
 * or a filter function.
 *
 * Objects are cached in the following way:
 *
 * - Cache is global, with objects being shared between all components. No
 *   fetching is done unless the objects are not in cache or stale. Check
 *   implementation for max cache age.
 * - Requesting all objects will return the entire cache if all objects have
 *   already been requested less than max cache age ago, or fetch otherwise.
 * - Passing a filter function is similar to requesting all objects, only
 *   filtering the result.
 * - Requesting a list of object IDs will try the cache first, refetching any
 *   stale objects.
 */
export function createStoredObjectsHook<
  T extends Record<string, unknown>,
  C extends unknown[],
  U extends unknown[],
>(
  uniqueId: string,
  storageFunctions: {
    getId: (obj: T) => string;
    create: (...args: C) => Promise<T>;
    get: (...ids: string[]) => Promise<Record<string, T>>;
    getAll: () => Promise<Record<string, T>>;
    update: (...args: U) => Promise<T>;
    delete: (...ids: string[]) => Promise<void>;
  },
  { cacheMaxAgeSeconds = defaultCacheMaxAgeSeconds }: { cacheMaxAgeSeconds?: number } = {},
) {
  const cachedStore = new CachedStore<T>(
    uniqueId,
    cacheMaxAgeSeconds,
    storageFunctions.get,
    storageFunctions.getAll,
  );
  const pubsub = new PubSub<T>(cachedStore);

  type StoredObjects = {
    objs: Record<string, T>;
    isLoading: boolean;
    update: (...args: U) => Promise<void>;
    create: (...args: C) => Promise<void>;
    delete: (...objs: T[]) => Promise<void>;
  };

  function useStoredObjects(): StoredObjects;
  function useStoredObjects(filter: (obj: T) => boolean): StoredObjects;
  function useStoredObjects(ids: string[]): StoredObjects;

  function useStoredObjects(filterOrIds?: string[] | ((obj: T) => boolean)): StoredObjects {
    const [objects, setObjects] = useState<Record<string, T>>({});
    const [isLoading, setIsLoading] = useState(false);

    const filter = typeof filterOrIds === "function" ? filterOrIds : null;
    const objectIds = Array.isArray(filterOrIds) ? filterOrIds : null;

    const listener = (objs: Record<string, T> | null) => {
      setObjects(objs ?? {});
      setIsLoading(objs === null);
    };

    useEffect(
      () => {
        if (objectIds) {
          pubsub.sub(listener, objectIds);
        } else if (filter) {
          pubsub.subAll(listener, filter);
        } else {
          pubsub.subAll(listener);
        }

        void pubsub.pub([listener]);

        return () => {
          pubsub.unsub(listener);
        };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [objectIds?.join(",") ?? ""],
    );

    /**
     * Each wrapper should:
     *
     * 1. do its action
     * 2. subscribe to new IDs (if relevant)
     * 3. update cache (if relevant)
     * 4. publish update to subscribers (if relevant)
     */

    const updateWrapper = useCallback(async (...args: U) => {
      const updated = await storageFunctions.update(...args);
      const id = storageFunctions.getId(updated);

      cachedStore.update({ [id]: updated }, Date.now());

      await pubsub.pubObjs([[id, updated]]);
    }, []);

    const createWrapper = useCallback(async (...args: C) => {
      const newObj = await storageFunctions.create(...args);
      const id = storageFunctions.getId(newObj);

      cachedStore.update({ [id]: newObj }, Date.now());

      await pubsub.pubObjs([[id, newObj]]);
    }, []);

    const deleteWrapper = useCallback(async (...objs: T[]) => {
      const ids = objs.map((obj) => storageFunctions.getId(obj));

      await storageFunctions.delete(...ids);

      cachedStore.delete(...ids);

      await pubsub.pubDeletion(objs.map((obj) => [storageFunctions.getId(obj), obj]));
    }, []);

    return {
      objs: objects,
      isLoading,
      update: updateWrapper,
      create: createWrapper,
      delete: deleteWrapper,
    };
  }

  // Expose a secondary hook that returns a single object.

  type StoredObject = {
    obj: T | null;
    id: string | null;
    isLoading: boolean;
    update: (...args: U) => Promise<void>;
    create: (...args: C) => Promise<void>;
    delete: (...objs: T[]) => Promise<void>;
  };

  function useStoredObject(filter: (obj: T) => boolean): StoredObject;
  function useStoredObject(id: string): StoredObject;

  function useStoredObject(filterOrId: string | ((obj: T) => boolean)): StoredObject {
    let data: StoredObjects;

    if (typeof filterOrId === "string") {
      data = useStoredObjects([filterOrId]);
    } else {
      data = useStoredObjects(filterOrId);
    }

    const entry = Object.entries(data.objs)[0];

    const [id, obj] = entry ? entry : [null, null];

    return {
      obj,
      id,
      isLoading: data.isLoading,
      update: data.update,
      create: data.create,
      delete: data.delete,
    };
  }

  return [useStoredObject, useStoredObjects] as const;
}

type Sub<T> = (objs: Record<string, T> | null) => void;

/**
 * Simple pubsub class that allows:
 *
 *   - registering functions as subscribers to either all IDs or a set of them
 *   - triggering those subscribers
 *
 * TODO: update this class so it completely owns the cached store, instantiates
 *       it and is the only one that calls it ever.
 */
class PubSub<T> {
  // We keep two data structures with the same data for more efficient lookups.
  private idsPerSub = new Map<Sub<T>, Set<string>>();
  private subsPerId = new Map<string, Set<Sub<T>>>();

  /**
   * For subscribers to all objects, we store:
   * - The subscriber function itself
   * - An optional filter function
   */
  private subbedToAll = new Map<Sub<T>, ((obj: T) => boolean) | null>();

  constructor(private store: CachedStore<T>) {}

  async pub(subs: Sub<T>[]): Promise<void> {
    // Publish null to subs before fetching to signal loading state.
    subs.forEach((sub) => {
      sub(null);
    });

    const [ids, anySubbedAll] = this.getIds(subs);

    let objs: Record<string, T>;

    if (anySubbedAll) {
      objs = await this.store.getAll();
    } else {
      objs = await this.store.get(ids);
    }

    // Call subs
    for (const sub of subs) {
      if (this.subbedToAll.has(sub)) {
        const filter = this.subbedToAll.get(sub);

        if (!filter) {
          sub(objs);
        } else {
          sub(Object.fromEntries(Object.entries(objs).filter(([_, obj]) => filter(obj))));
        }
      } else {
        const subIds = this.idsPerSub.get(sub);
        if (subIds) {
          const subObjs: Record<string, T> = {};

          subIds.forEach((id) => {
            if (id in objs) subObjs[id] = objs[id]!;
          });

          sub(subObjs);
        }
      }
    }
  }

  async pubObjs(objs: [string, T][]) {
    const subs = new Set<Sub<T>>();

    // Out of subs that subscribe to all, gather those that have no filter or
    // that select for at least one of the updated objects.
    this.subbedToAll.forEach((filter, sub) => {
      if (filter && !objs.some(([_, obj]) => filter(obj))) {
        return;
      }
      subs.add(sub);
    });

    objs.forEach(([id, _]) => {
      this.subsPerId.get(id)?.forEach((sub) => {
        subs.add(sub);
      });
    });

    await this.pub(Array.from(subs));
  }

  async pubDeletion(deletedObjs: [string, T][]) {
    const subs = new Set<Sub<T>>();

    // Get all subs subbed to all objs with either no filter or that select
    // for one of the deleted objs.
    this.subbedToAll
      .entries()
      .filter(([_, filter]) => !filter || deletedObjs.some(([_, obj]) => filter(obj)))
      .forEach(([sub, _]) => {
        subs.add(sub);
      });

    deletedObjs.forEach(([id]) => {
      this.subsPerId.get(id)?.forEach((sub) => {
        subs.add(sub);
      });
    });

    this.unsubAll(deletedObjs.map(([id]) => id));

    return this.pub(Array.from(subs));
  }

  sub(sub: Sub<T>, ids: string[]) {
    if (ids.length === 0) return;

    ids.forEach((id) => {
      if (!this.subsPerId.has(id)) this.subsPerId.set(id, new Set());
      this.subsPerId.get(id)!.add(sub);
    });

    this.idsPerSub.set(sub, (this.idsPerSub.get(sub) ?? new Set()).union(new Set(ids)));
  }

  subAll(sub: Sub<T>, filter?: (obj: T) => boolean) {
    // Remove any previous subscriptions.
    this.unsub(sub, { deleteOrphans: false });

    this.subbedToAll.set(sub, filter ?? null);
  }

  unsub(sub: Sub<T>, { deleteOrphans = true } = {}) {
    const wasSubbedToAll = this.subbedToAll.delete(sub);

    const ids = this.idsPerSub.get(sub);
    const orphanIds: string[] = [];

    if (ids) {
      this.idsPerSub.delete(sub);

      ids.forEach((id) => {
        const subs = this.subsPerId.get(id);

        if (!subs) return;

        subs.delete(sub);

        if (subs.size === 0) {
          this.subsPerId.delete(id);
          orphanIds.push(id);
        }
      });
    }

    // No IDs are orphaned unless no one is subscribed to all.
    if (deleteOrphans && this.subbedToAll.size === 0) {
      if (wasSubbedToAll) {
        // console.log(
        //   `Deleting all orphaned "${this.store.name}" items from cache because last sub subbed to all items just unsubscribed...`,
        // );
        const idsWithSubs = Object.keys(this.subsPerId);
        this.store.deleteAllBut(...idsWithSubs);
      } else {
        // console.log(
        //   `Deleting newly orphaned "${this.store.name}" items from cache: ${orphanIds.map((x) => `"${x}"`).join(", ")}`,
        // );
        this.store.delete(...orphanIds);
      }
    }
  }

  /** Unsubscribe all subscribers to the given IDs. */
  unsubAll(ids: string[]) {
    ids.forEach((id) => {
      if (id in this.subsPerId) {
        this.subsPerId.delete(id);
      }
    });

    this.idsPerSub.forEach((subIds, sub) => {
      subIds.forEach((id) => {
        if (ids.includes(id)) {
          subIds.delete(id);
        }
      });

      if (subIds.size === 0) {
        this.idsPerSub.delete(sub);
      }
    });
  }

  private getIds(subs: Sub<T>[]): [string[], boolean] {
    if (subs.some((sub) => this.subbedToAll.has(sub))) {
      return [[], true];
    }

    let ids = new Set<string>();

    for (const sub of subs) {
      const subIds = this.idsPerSub.get(sub);
      if (subIds) {
        ids = ids.union(subIds);
      }
    }

    return [Array.from(ids), false];
  }
}

class CachedStore<T> {
  private static stores = new Map<string, CachedStore<unknown>>();

  private cache = new Map<string, [T, number]>();

  private fetchAllLock: Promise<void> | null = null;
  private lastFetchAll = 0;

  private fetchLocks = new Map<string, Promise<void>>();

  constructor(
    public name: string,
    public maxAgeSeconds: number,
    private fetch: (...ids: string[]) => Promise<Record<string, T>>,
    private fetchAll: () => Promise<Record<string, T>>,
  ) {
    if (CachedStore.stores.has(name)) {
      throw Error(
        `A cached store with name "${name}" already exists. This likely means there ` +
          `is some error in the code.`,
      );
    } else {
      CachedStore.stores.set(this.name, this);
    }
  }

  update(objs: Record<string, T>, now: number) {
    Object.entries(objs).forEach(([id, obj]) => {
      // Delete first to ensure we track insertion order.
      this.cache.delete(id);
      this.cache.set(id, [obj, now]);
    });
  }

  async get(ids: string[]): Promise<Record<string, T>> {
    let objs: Record<string, T> = {};
    const nonCachedIds: string[] = [];

    for (const id of ids) {
      if (!this.cache.has(id)) {
        nonCachedIds.push(id);
        continue;
      }

      const [item, timestamp] = this.cache.get(id)!;

      if (this.isExpired(timestamp)) {
        // console.log(`Deleting expired "${this.name}" item from cache with ID "${id}"...`);
        this.cache.delete(id);
        nonCachedIds.push(id);
        continue;
      }

      objs[id] = item;
    }

    if (nonCachedIds.length > 0) {
      const [unlock, waited] = await this.lockFetch(ids);

      if (waited) {
        // console.log("Ongoing fetch detected. Retrying get to avoid refetching...");
        unlock();
        return this.get(ids);
      }

      // console.log(
      //   `Fetching ${nonCachedIds.length} "${this.name}" items from DB with IDs ${nonCachedIds.map((x) => `"${x}"`).join(", ")}...`,
      // );

      try {
        const freshObjs = await this.fetch(...nonCachedIds);
        this.update(freshObjs, Date.now());
        objs = { ...objs, ...freshObjs };
      } finally {
        unlock();
      }
    }

    return objs;
  }

  async getAll(): Promise<Record<string, T>> {
    const shouldFetch = Date.now() - this.lastFetchAll >= this.maxAgeSeconds * 1000;

    if (shouldFetch) {
      // const secondsAgo = Math.round((Date.now() - this.lastFetchAll) / 1000);

      const [unlock, waited] = await this.lockFetchAll();

      if (waited) {
        // console.log("Ongoing fetch detected. Retrying getAll to avoid refetching...");
        unlock();
        return this.getAll();
      }

      // console.log(
      //   `Fetching all "${this.name}" items from DB... (last fetch was ${this.lastFetchAll === 0 ? "never" : `${secondsAgo} seconds ago, max cache age is ${this.maxAgeSeconds} seconds`})`,
      // );

      try {
        const all = await this.fetchAll();

        // console.log(`Got all "${this.name}" items from DB (${Object.keys(all).length}):`);
        // console.log(all);

        const now = Date.now();

        this.cache.clear();
        this.update(all, now);
        this.lastFetchAll = now;
      } finally {
        unlock();
      }
    }

    return this.getCacheObjs();
  }

  delete(...ids: string[]) {
    // console.log(
    //   `Deleting "${this.name}" items from cache with IDs ${ids.map((x) => `"${x}"`).join(", ")}`,
    // );
    ids.forEach((id) => {
      this.cache.delete(id);
    });
  }

  deleteAllBut(...ids: string[]) {
    this.cache.forEach((_, id) => {
      if (!ids.includes(id)) {
        this.cache.delete(id);
      }
    });
  }

  clear() {
    // console.log(`Clearing all "${this.name}" items from cache`);
    this.cache.clear();
  }

  private isExpired(timestamp: number) {
    return this.maxAgeSeconds >= 0 && Date.now() - timestamp > this.maxAgeSeconds * 1000;
  }

  private getCacheObjs() {
    return Object.fromEntries(this.cache.entries().map(([id, [obj, _]]) => [id, obj]));
  }

  private async lockFetchAll(): Promise<[() => void, boolean]> {
    let waited = false;
    while (this.fetchAllLock) {
      // eslint-disable-next-line no-await-in-loop
      await this.fetchAllLock;
      waited = true;
    }

    // console.log("Locking fetch all.");

    let unlock: () => void = () => {
      throw Error("Unset.");
    };

    this.fetchAllLock = new Promise((resolve) => {
      unlock = () => {
        this.fetchAllLock = null;
        resolve();
        // console.log("Unlocking fetch all.");
      };
    });

    return [unlock, waited] as const;
  }

  private async lockFetch(ids: string[]): Promise<[() => void, boolean]> {
    let locks: Promise<void>[];
    let waited = false;
    do {
      locks = this.fetchLocks
        .keys()
        .toArray()
        .filter((id) => ids.includes(id))
        .map((id) => this.fetchLocks.get(id)!);

      if (this.fetchAllLock) locks.push(this.fetchAllLock);

      if (locks.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(locks);
        waited = true;
      }
    } while (locks.length > 0);

    // console.log("Locking fetch by ID.");

    let unlock: () => void = () => {
      throw Error("Unset.");
    };

    const promise = new Promise<void>((resolve) => {
      unlock = () => {
        for (const id of ids) {
          this.fetchLocks.delete(id);
        }

        resolve();

        // console.log("Unlocking fetch by ID.");
      };
    });

    for (const id of ids) {
      this.fetchLocks.set(id, promise);
    }

    return [unlock, waited] as const;
  }
}
