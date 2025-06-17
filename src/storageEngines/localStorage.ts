import { type StorageEngineParams } from "../tinyORM";

type Dict = Record<string, any>;

function tupleMap<Tuple extends readonly unknown[], Result>(
  tuple: Tuple,
  map: (item: Tuple[number]) => Result
) {
  return tuple.map(map) as { [K in keyof Tuple]: Result };
}

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
    /** Get all items. */
    getAll(): T[] {
      const stored = getStored();

      return Object.values(stored).map((x) =>
        migrate(x.object, x.modelVersion)
      );
    },
    /**
     * Get items by ID.
     * Missing items are set to null in result.
     */
    get<Ids extends readonly string[]>(
      ...ids: Ids
    ): { [K in keyof Ids]: T | null } {
      const stored = getStored();

      return tupleMap(ids, (id) => {
        const obj = stored[id];

        if (!obj) return null;

        return migrate(obj.object, obj.modelVersion);
      });
    },
    /**
     * Get items by ID.
     * Throws if an item is missing.
     */
    getStrict<Ids extends readonly string[]>(
      ...ids: Ids
    ): { [K in keyof Ids]: T } {
      const stored = getStored();

      return tupleMap(ids, (id) => {
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
