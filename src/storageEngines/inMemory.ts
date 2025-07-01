import { type JsonValue, type StorageEngineParams } from "../tinyORM";

export function inMemoryStorageEngine<T extends JsonValue>({
  currentVersion,
  getId,
  migrate,
}: StorageEngineParams<T>) {
  const storage: Record<
    string,
    {
      modelVersion: number;
      object: JsonValue;
    }
  > = {};

  return {
    save: (...objs: T[]) => {
      objs.forEach((x) => {
        storage[getId(x)] = {
          modelVersion: currentVersion,
          object: x,
        };
      });
    },
    delete: (...ids: string[]) => {
      ids.forEach((id) => {
        delete storage[id];
      });
    },
    get: (id: string) => {
      const obj = storage[id];

      if (!obj) {
        throw new Error(`Item with ID "${id}" not found.`);
      }

      return migrate(obj.object, obj.modelVersion);
    },
  };
}
