import { type StorageEngineParams } from "../tinyORM";
type Dict = Record<string, any>;
export declare function localStorageEngine<T extends Dict>({ modelName, currentVersion, getId, migrate, }: StorageEngineParams<T>): {
    save(...objs: T[]): void;
    /** Get all items. */
    getAll(): T[];
    /**
     * Get items by ID.
     * Missing items are set to null in result.
     */
    get<Ids extends readonly string[]>(...ids: Ids): { [K in keyof Ids]: T | null; };
    /**
     * Get items by ID.
     * Throws if an item is missing.
     */
    getStrict<Ids extends readonly string[]>(...ids: Ids): { [K in keyof Ids]: T; };
};
export {};
