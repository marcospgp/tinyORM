import { createStorageEngine } from "@/tinyORM";

export const inMemoryStorageEngine = createStorageEngine(
  (modelName, modelVersion, getId, migrate) => ({
    get(id: string): T {
      const obj = storage[id];

      if (!obj) {
        throw new Error(`Item with ID "${id}" not found.`);
      }

      return migrate(obj);
    },
    save(objOrObjs: T | T[]) {
      let objs;
      if (Array.isArray(objOrObjs)) {
        objs = objOrObjs;
      } else {
        objs = [objOrObjs];
      }

      objs.forEach((x) => {
        storage[getId(x)] = x;
      });
    },
  })
);
