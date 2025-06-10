import { BaseModel } from "@/tinyORM";

export type StorageEngine<T extends BaseModel> = (
  getId: (obj: T) => string,
  migrate: (prev: BaseModel) => T
) => Record<string, (...args: any[]) => any>;
