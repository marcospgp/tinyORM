import { type StorageEngineParams } from "../tinyORM";
type Dict = Record<string, any>;
export declare function inMemoryStorageEngine<T extends Dict>({ modelName, currentVersion, getId, migrate, }: StorageEngineParams<T>): {
    get: (id: string) => T;
    save: (...objs: T[]) => void;
};
export {};
