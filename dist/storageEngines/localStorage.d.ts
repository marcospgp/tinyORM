import { StorageEngineParams } from "@/tinyORM";
type Dict = Record<string, any>;
export declare function localStorageEngine<T extends Dict>({ modelName, modelVersion, getId, migrate, }: StorageEngineParams<T>): {
    get(...ids: string[]): T[];
    save(...objs: T[]): void;
};
export {};
