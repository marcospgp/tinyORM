import { type StorageEngineParams } from "../tinyORM";

type Dict = Record<string, any>;

export function inMemoryStorageEngine<T extends Dict>({
  modelName,
  currentVersion,
  getId,
  migrate,
}: StorageEngineParams<T>) {
  const storage: Record<
    string,
    {
      modelName: string;
      modelVersion: number;
      object: Dict;
    }
  > = {};

  return {
    get(id: string) {
      const obj = storage[id];

      if (!obj) {
        throw new Error(`Item with ID "${id}" not found.`);
      }

      return migrate(obj.object, obj.modelVersion);
    },
    save(...objs: T[]) {
      objs.forEach((x) => {
        storage[getId(x)] = {
          modelName,
          modelVersion: currentVersion,
          object: x,
        };
      });
    },
  };
}
