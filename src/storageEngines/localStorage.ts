import { createStorageEngine } from "@/tinyORM";

type Test = {
  mama: number;
};

type Dict = Record<string, any>;

type Stored<T extends Dict = Dict> = {
  modelName: string;
  modelVersion: number;
  object: T;
};

export const localStorageEngine = createStorageEngine(
  (modelName, modelVersion, getId, migrate) => {
    return {
      get(...ids: string[]) {
        return ids.map((rawId) => {
          const id = `${modelName}-${rawId}`;
          const item = localStorage.getItem(id);
          if (!item) {
            throw new Error(`Item with ID "${id}" not found.`);
          }

          const obj = JSON.parse(item) as Stored;

          return migrate(obj.object, obj.modelVersion);
        });
      },
      save(...objs: Test[]) {
        objs.forEach((x) => {
          const store: Stored = {
            modelName,
            modelVersion,
            object: x,
          };
          localStorage.setItem(
            `${modelName}-${getId(x)}`,
            JSON.stringify(store)
          );
        });
      },
    };
  }
);
