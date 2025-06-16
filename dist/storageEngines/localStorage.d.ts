import { type StorageEngineParams } from "../tinyORM";
type Dict = Record<string, any>;
export declare function localStorageEngine<T extends Dict>({ modelName, currentVersion, getId, migrate, }: StorageEngineParams<T>): {
    save(...objs: T[]): void;
    get(...ids: string[]): (T | null)[];
    getStrict(...ids: string[]): T[];
};
export {};
