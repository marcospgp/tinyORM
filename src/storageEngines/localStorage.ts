import { StorageEngineParams } from "@/tinyORM";

type Dict = Record<string, any>;

export function localStorageEngine<T extends Dict>({
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
    save(...objs: T[]) {
      objs.forEach((x) => {
        const store: Stored = {
          modelName,
          modelVersion,
          object: x,
        };
        localStorage.setItem(`${modelName}-${getId(x)}`, JSON.stringify(store));
      });
    },
  };
}
