import { type StorageEngineParams } from "../tinyORM";
type Dict = Record<string, any>;
export declare function localStorageEngine<T extends Dict>({ modelName, currentVersion, getId, migrate, }: StorageEngineParams<T>): {
    save(...objs: T[]): void;
    /**
     * Get items by ID.
     * If no IDs provided, returns all items.
     * Missing items are set to null in result.
     */
    get(...ids: string[]): (T | null)[];
    /**
     * Get items by ID.
     * If no IDs provided, returns all items.
     * Throws if an item is missing.
     */
    getStrict(...ids: string[]): T[];
};
export {};
