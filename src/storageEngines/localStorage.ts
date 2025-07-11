import { type JsonValue, type StorageEngineParams } from "../tinyORM";

/** Like array's map but preserves tuple typing.  */
function tupleMap<Tuple extends readonly unknown[], Result>(
  tuple: Tuple,
  map: (item: Tuple[number]) => Result
) {
  return tuple.map(map) as { [K in keyof Tuple]: Result };
}

export function localStorageEngine<T extends JsonValue>({
  modelName,
  currentVersion,
  getId,
  migrate,
}: StorageEngineParams<T>) {
  type Stored = Record<
    string,
    {
      modelVersion: number;
      object: JsonValue;
    }
  >;

  const getStored = () =>
    JSON.parse(localStorage.getItem(modelName) ?? "{}") as Stored;

  return {
    save: (...objs: T[]) => {
      const stored = getStored();

      objs.forEach((x) => {
        stored[getId(x)] = {
          modelVersion: currentVersion,
          object: x,
        };
      });

      localStorage.setItem(modelName, JSON.stringify(stored));
    },
    delete: (...ids: string[]) => {
      const stored = getStored();

      const filtered = Object.fromEntries(
        Object.entries(stored).filter(([id]) => !ids.includes(id))
      );

      localStorage.setItem(modelName, JSON.stringify(filtered));
    },
    /** Get all items. */
    getAll: (): Record<string, T> => {
      const stored = getStored();

      const result: Record<string, T> = {};

      Object.entries(stored).forEach(([id, { modelVersion, object }]) => {
        result[id] = migrate(object, modelVersion);
      });

      return result;
    },
    /**
     * Get items by ID.
     * Missing items are set to null in result.
     */
    get: <Ids extends readonly string[]>(
      ...ids: Ids
    ): { [K in keyof Ids]: T | null } => {
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
    getStrict: <Ids extends readonly string[]>(
      ...ids: Ids
    ): { [K in keyof Ids]: T } => {
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
