// src/tinyORM.ts
function createModel(modelName, getId, storageEngine, utilityMethods = {}, migrations = []) {
  const currentVersion = migrations.length + 1;
  function migrate(prev, version) {
    if (!migrations || version === currentVersion) {
      return prev;
    }
    let cur = { ...prev };
    for (let i = version - 1;i < migrations.length; i++) {
      const migration = migrations[i];
      if (!migration) {
        throw Error(`No migration from version ${i + 1} to version ${i + 2} found.`);
      }
      cur = migration(cur);
    }
    return cur;
  }
  return {
    ...utilityMethods,
    ...storageEngine({
      modelName,
      modelVersion: currentVersion,
      getId,
      migrate
    }),
    create(obj) {
      return {
        ...obj,
        __tinyorm_model_version: currentVersion
      };
    }
  };
}
// src/storageEngines/localStorage.ts
function localStorageEngine({
  modelName,
  modelVersion,
  getId,
  migrate
}) {
  return {
    get(...ids) {
      return ids.map((rawId) => {
        const id = `${modelName}-${rawId}`;
        const item = localStorage.getItem(id);
        if (!item) {
          throw new Error(`Item with ID "${id}" not found.`);
        }
        const obj = JSON.parse(item);
        return migrate(obj.object, obj.modelVersion);
      });
    },
    save(...objs) {
      objs.forEach((x) => {
        const store = {
          modelName,
          modelVersion,
          object: x
        };
        localStorage.setItem(`${modelName}-${getId(x)}`, JSON.stringify(store));
      });
    }
  };
}
// src/storageEngines/inMemory.ts
function inMemoryStorageEngine({
  modelName,
  modelVersion,
  getId,
  migrate
}) {
  const storage = {};
  return {
    get(rawId) {
      const id = `${modelName}-${rawId}`;
      const obj = storage[id];
      if (!obj) {
        throw new Error(`Item with ID "${id}" not found.`);
      }
      return migrate(obj.object, obj.modelVersion);
    },
    save(...objs) {
      objs.forEach((x) => {
        const store = {
          modelName,
          modelVersion,
          object: x
        };
        const id = `${modelName}-${getId(x)}`;
        storage[id] = store;
      });
    }
  };
}
export {
  localStorageEngine,
  inMemoryStorageEngine,
  createModel
};
