// src/tinyORM.ts
function createModel(modelName, getId, storageEngine, methodsFactory, migrations) {
  const currentVersion = migrations ? migrations.length + 1 : 1;
  function migrate(prev, version) {
    if (!migrations || version === currentVersion) {
      return prev;
    }
    let cur = Array.isArray(prev) ? [...prev] : typeof prev === "object" && prev !== null ? { ...prev } : prev;
    for (let i = version - 1;i < migrations.length; i++) {
      const migration = migrations[i];
      if (!migration) {
        throw Error(`No migration from version ${i + 1} to version ${i + 2} of model ${modelName} found.`);
      }
      try {
        cur = migration(cur);
      } catch (e) {
        console.error(`Failed to migrate object from version ${i + 1} to version ${i + 2} of model ${modelName}:`);
        console.error(JSON.stringify(cur, null, 4));
        throw e;
      }
    }
    return cur;
  }
  const storageMethods = storageEngine({
    modelName,
    currentVersion,
    getId,
    migrate
  });
  return {
    ...methodsFactory(storageMethods)
  };
}
// src/storageEngines/localStorage.ts
function tupleMap(tuple, map) {
  return tuple.map(map);
}
function localStorageEngine({
  modelName,
  currentVersion,
  getId,
  migrate
}) {
  const getStored = () => JSON.parse(localStorage.getItem(modelName) ?? "{}");
  return {
    save: (...objs) => {
      const stored = getStored();
      objs.forEach((x) => {
        stored[getId(x)] = {
          modelVersion: currentVersion,
          object: x
        };
      });
      localStorage.setItem(modelName, JSON.stringify(stored));
    },
    delete: (...ids) => {
      const stored = getStored();
      const filtered = Object.fromEntries(Object.entries(stored).filter(([id]) => !ids.includes(id)));
      localStorage.setItem(modelName, JSON.stringify(filtered));
    },
    getAll: () => {
      const stored = getStored();
      const result = {};
      Object.entries(stored).forEach(([id, { modelVersion, object }]) => {
        result[id] = migrate(object, modelVersion);
      });
      return result;
    },
    get: (...ids) => {
      const stored = getStored();
      return tupleMap(ids, (id) => {
        const obj = stored[id];
        if (!obj)
          return null;
        return migrate(obj.object, obj.modelVersion);
      });
    },
    getStrict: (...ids) => {
      const stored = getStored();
      return tupleMap(ids, (id) => {
        const obj = stored[id];
        if (!obj) {
          throw Error(`Object of model "${modelName}" with ID "${id}" not found in localStorage!`);
        }
        return migrate(obj.object, obj.modelVersion);
      });
    }
  };
}
// src/storageEngines/inMemory.ts
function inMemoryStorageEngine({
  currentVersion,
  getId,
  migrate
}) {
  const storage = {};
  return {
    save: (...objs) => {
      objs.forEach((x) => {
        storage[getId(x)] = {
          modelVersion: currentVersion,
          object: x
        };
      });
    },
    delete: (...ids) => {
      ids.forEach((id) => {
        delete storage[id];
      });
    },
    get: (id) => {
      const obj = storage[id];
      if (!obj) {
        throw new Error(`Item with ID "${id}" not found.`);
      }
      return migrate(obj.object, obj.modelVersion);
    }
  };
}
// src/react/createStoredObjectsHook.ts
import { useCallback, useEffect, useState } from "react";
var defaultCacheMaxAgeSeconds = 30;
function createStoredObjectsHook(uniqueId, storageFunctions, { cacheMaxAgeSeconds = defaultCacheMaxAgeSeconds } = {}) {
  const cachedStore = new CachedStore(uniqueId, cacheMaxAgeSeconds, storageFunctions.get, storageFunctions.getAll);
  const pubsub = new PubSub(cachedStore);
  function useStoredObjects(filterOrIds) {
    const [objects, setObjects] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const filter = typeof filterOrIds === "function" ? filterOrIds : null;
    const objectIds = Array.isArray(filterOrIds) ? filterOrIds : null;
    const listener = (objs) => {
      setObjects(objs ?? {});
      setIsLoading(objs === null);
    };
    useEffect(() => {
      if (objectIds) {
        pubsub.sub(listener, objectIds);
      } else if (filter) {
        pubsub.subAll(listener, filter);
      } else {
        pubsub.subAll(listener);
      }
      pubsub.pub([listener]);
      return () => {
        pubsub.unsub(listener);
      };
    }, [objectIds?.join(",") ?? ""]);
    const updateWrapper = useCallback(async (...args) => {
      const updated = await storageFunctions.update(...args);
      const id = storageFunctions.getId(updated);
      cachedStore.update({ [id]: updated }, Date.now());
      await pubsub.pubObjs([[id, updated]]);
    }, []);
    const createWrapper = useCallback(async (...args) => {
      const newObj = await storageFunctions.create(...args);
      const id = storageFunctions.getId(newObj);
      cachedStore.update({ [id]: newObj }, Date.now());
      await pubsub.pubObjs([[id, newObj]]);
    }, []);
    const deleteWrapper = useCallback(async (...objs) => {
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
      delete: deleteWrapper
    };
  }
  function useStoredObject(filterOrId) {
    let data;
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
      delete: data.delete
    };
  }
  return [useStoredObject, useStoredObjects];
}

class PubSub {
  store;
  idsPerSub = new Map;
  subsPerId = new Map;
  subbedToAll = new Map;
  constructor(store) {
    this.store = store;
  }
  async pub(subs) {
    subs.forEach((sub) => {
      sub(null);
    });
    const [ids, anySubbedAll] = this.getIds(subs);
    let objs;
    if (anySubbedAll) {
      objs = await this.store.getAll();
    } else {
      objs = await this.store.get(ids);
    }
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
          const subObjs = {};
          subIds.forEach((id) => {
            if (id in objs)
              subObjs[id] = objs[id];
          });
          sub(subObjs);
        }
      }
    }
  }
  async pubObjs(objs) {
    const subs = new Set;
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
  async pubDeletion(deletedObjs) {
    const subs = new Set;
    this.subbedToAll.entries().filter(([_, filter]) => !filter || deletedObjs.some(([_2, obj]) => filter(obj))).forEach(([sub, _]) => {
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
  sub(sub, ids) {
    if (ids.length === 0)
      return;
    ids.forEach((id) => {
      if (!this.subsPerId.has(id))
        this.subsPerId.set(id, new Set);
      this.subsPerId.get(id).add(sub);
    });
    this.idsPerSub.set(sub, (this.idsPerSub.get(sub) ?? new Set).union(new Set(ids)));
  }
  subAll(sub, filter) {
    this.unsub(sub, { deleteOrphans: false });
    this.subbedToAll.set(sub, filter ?? null);
  }
  unsub(sub, { deleteOrphans = true } = {}) {
    const wasSubbedToAll = this.subbedToAll.delete(sub);
    const ids = this.idsPerSub.get(sub);
    const orphanIds = [];
    if (ids) {
      this.idsPerSub.delete(sub);
      ids.forEach((id) => {
        const subs = this.subsPerId.get(id);
        if (!subs)
          return;
        subs.delete(sub);
        if (subs.size === 0) {
          this.subsPerId.delete(id);
          orphanIds.push(id);
        }
      });
    }
    if (deleteOrphans && this.subbedToAll.size === 0) {
      if (wasSubbedToAll) {
        const idsWithSubs = Object.keys(this.subsPerId);
        this.store.deleteAllBut(...idsWithSubs);
      } else {
        this.store.delete(...orphanIds);
      }
    }
  }
  unsubAll(ids) {
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
  getIds(subs) {
    if (subs.some((sub) => this.subbedToAll.has(sub))) {
      return [[], true];
    }
    let ids = new Set;
    for (const sub of subs) {
      const subIds = this.idsPerSub.get(sub);
      if (subIds) {
        ids = ids.union(subIds);
      }
    }
    return [Array.from(ids), false];
  }
}

class CachedStore {
  name;
  maxAgeSeconds;
  fetch;
  fetchAll;
  static stores = new Map;
  cache = new Map;
  fetchAllLock = null;
  lastFetchAll = 0;
  fetchLocks = new Map;
  constructor(name, maxAgeSeconds, fetch, fetchAll) {
    this.name = name;
    this.maxAgeSeconds = maxAgeSeconds;
    this.fetch = fetch;
    this.fetchAll = fetchAll;
    if (CachedStore.stores.has(name)) {
      throw Error(`A cached store with name "${name}" already exists. This likely means there ` + `is some error in the code.`);
    } else {
      CachedStore.stores.set(this.name, this);
    }
  }
  update(objs, now) {
    Object.entries(objs).forEach(([id, obj]) => {
      this.cache.delete(id);
      this.cache.set(id, [obj, now]);
    });
  }
  async get(ids) {
    let objs = {};
    const nonCachedIds = [];
    for (const id of ids) {
      if (!this.cache.has(id)) {
        nonCachedIds.push(id);
        continue;
      }
      const [item, timestamp] = this.cache.get(id);
      if (this.isExpired(timestamp)) {
        this.cache.delete(id);
        nonCachedIds.push(id);
        continue;
      }
      objs[id] = item;
    }
    if (nonCachedIds.length > 0) {
      const [unlock, waited] = await this.lockFetch(ids);
      if (waited) {
        unlock();
        return this.get(ids);
      }
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
  async getAll() {
    const shouldFetch = Date.now() - this.lastFetchAll >= this.maxAgeSeconds * 1000;
    if (shouldFetch) {
      const [unlock, waited] = await this.lockFetchAll();
      if (waited) {
        unlock();
        return this.getAll();
      }
      try {
        const all = await this.fetchAll();
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
  delete(...ids) {
    ids.forEach((id) => {
      this.cache.delete(id);
    });
  }
  deleteAllBut(...ids) {
    this.cache.forEach((_, id) => {
      if (!ids.includes(id)) {
        this.cache.delete(id);
      }
    });
  }
  clear() {
    this.cache.clear();
  }
  isExpired(timestamp) {
    return this.maxAgeSeconds >= 0 && Date.now() - timestamp > this.maxAgeSeconds * 1000;
  }
  getCacheObjs() {
    return Object.fromEntries(this.cache.entries().map(([id, [obj, _]]) => [id, obj]));
  }
  async lockFetchAll() {
    let waited = false;
    while (this.fetchAllLock) {
      await this.fetchAllLock;
      waited = true;
    }
    let unlock = () => {
      throw Error("Unset.");
    };
    this.fetchAllLock = new Promise((resolve) => {
      unlock = () => {
        this.fetchAllLock = null;
        resolve();
      };
    });
    return [unlock, waited];
  }
  async lockFetch(ids) {
    let locks;
    let waited = false;
    do {
      locks = this.fetchLocks.keys().toArray().filter((id) => ids.includes(id)).map((id) => this.fetchLocks.get(id));
      if (this.fetchAllLock)
        locks.push(this.fetchAllLock);
      if (locks.length > 0) {
        await Promise.all(locks);
        waited = true;
      }
    } while (locks.length > 0);
    let unlock = () => {
      throw Error("Unset.");
    };
    const promise = new Promise((resolve) => {
      unlock = () => {
        for (const id of ids) {
          this.fetchLocks.delete(id);
        }
        resolve();
      };
    });
    for (const id of ids) {
      this.fetchLocks.set(id, promise);
    }
    return [unlock, waited];
  }
}
export {
  localStorageEngine,
  inMemoryStorageEngine,
  createStoredObjectsHook,
  createModel
};
