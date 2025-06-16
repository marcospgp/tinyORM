import { type StorageEngineParams } from "../tinyORM";

type Dict = Record<string, any>;

export function inMemoryStorageEngine<T extends Dict>({
  modelName,
  modelVersion,
  getId,
  migrate,
}: StorageEngineParams<T>) {
  type Stored = {
    modelName: string;
    modelVersion: number;
    object: Dict;
  };

  const storage: Record<string, Stored> = {};

  return {
    get(rawId: string) {
      const id = `${modelName}-${rawId}`;

      const obj = storage[id];

      if (!obj) {
        throw new Error(`Item with ID "${id}" not found.`);
      }

      return migrate(obj.object, obj.modelVersion);
    },
    save(...objs: T[]) {
      objs.forEach((x) => {
        const store: Stored = {
          modelName,
          modelVersion,
          object: x,
        };

        const id = `${modelName}-${getId(x)}`;

        storage[id] = store;
      });
    },
  };
}
