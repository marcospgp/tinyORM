import { type StorageEngineParams } from "../tinyORM";
type Dict = Record<string, any>;
export declare function inMemoryStorageEngine<T extends Dict>({ modelName, modelVersion, getId, migrate, }: StorageEngineParams<T>): {
    get(rawId: string): T;
    save(...objs: T[]): void;
};
export {};
