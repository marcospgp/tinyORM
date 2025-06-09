import { BaseModel } from "tinyORM";

export function localStorageEngine<T extends BaseModel>(
  getId: (obj: T) => string,
  migrate: (prev: BaseModel) => T
) {
  return {
    get(id: string): T {
      const item = localStorage.getItem(id);
      if (!item) {
        throw new Error(`Item with ID "${id}" not found.`);
      }

      const obj = JSON.parse(item) as BaseModel;

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
        localStorage.setItem(getId(x), JSON.stringify(x));
      });
    },
  };
}

export type TimestampedModel = BaseModel & {
  /** ISO timestamp. */
  created_at: string;
  /** ISO timestamp. */
  updated_at: string;
};

export function timestampedLocalStorageEngine<T extends BaseModel>(
  getId: (obj: T) => string,
  migrate: (prev: Record<string, unknown>) => T
) {
  const ls = localStorageEngine(getId, migrate);

  return {
    ...ls,
    save(id: string, obj: Record<string, unknown>) {
      obj["updated_at"] = new Date().toISOString();

      localStorage.setItem(id, JSON.stringify(obj));
    },
  };
}
