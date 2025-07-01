import { type JsonValue, type StorageEngineParams } from "../tinyORM";
export declare function inMemoryStorageEngine<T extends JsonValue>({ currentVersion, getId, migrate, }: StorageEngineParams<T>): {
    save: (...objs: T[]) => void;
    delete: (...ids: string[]) => void;
    get: (id: string) => T;
};
