import { type StorageEngineParams } from "../tinyORM";

type Dict = Record<string, any>;

export function localStorageEngine<T extends Dict>({
  modelName,
  currentVersion,
  getId,
  migrate,
}: StorageEngineParams<T>) {
  type Stored = Record<
    string,
    {
      modelVersion: number;
      object: Dict;
    }
  >;

  const getStored = () =>
    JSON.parse(localStorage.getItem(modelName) ?? "{}") as Stored;

  return {
    save(...objs: T[]) {
      const stored = getStored();

      objs.forEach((x) => {
        stored[getId(x)] = {
          modelVersion: currentVersion,
          object: x,
        };
      });

      localStorage.setItem(modelName, JSON.stringify(stored));
    },
    get(...ids: string[]): (T | null)[] {
      const stored = getStored();

      if (ids.length === 0) {
        ids = Object.keys(stored);
      }

      return ids.map((id) => {
        const obj = stored[id];

        if (!obj) {
          return null;
        }

        return migrate(obj.object, obj.modelVersion);
      });
    },
    getStrict(...ids: string[]): T[] {
      const stored = getStored();

      if (ids.length === 0) {
        ids = Object.keys(stored);
      }

      return ids.map((id) => {
        const obj = stored[id];

        if (!obj) {
          throw Error(
            `Object of model "${modelName}" with ID "${id}" not found in localStorage!`
          );
        }

        return migrate(obj.object, obj.modelVersion);
      });
    },
  };
}
