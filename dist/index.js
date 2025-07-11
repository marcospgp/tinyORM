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
export {
  localStorageEngine,
  inMemoryStorageEngine,
  createModel
};
