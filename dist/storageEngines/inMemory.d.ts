import { type JsonValue, type StorageEngineParams } from "../tinyORM";
export declare function inMemoryStorageEngine<T extends JsonValue>({ modelName, currentVersion, getId, migrate, }: StorageEngineParams<T>): {
    get: (id: string) => T;
    save: (...objs: T[]) => void;
};
