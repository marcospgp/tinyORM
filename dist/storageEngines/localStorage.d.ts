import { type JsonValue, type StorageEngineParams } from "../tinyORM";
export declare function localStorageEngine<T extends JsonValue>({ modelName, currentVersion, getId, migrate, }: StorageEngineParams<T>): {
    save: (...objs: T[]) => void;
    /** Get all items. */
    getAll: () => T[];
    /**
     * Get items by ID.
     * Missing items are set to null in result.
     */
    get: <Ids extends readonly string[]>(...ids: Ids) => { [K in keyof Ids]: T | null; };
    /**
     * Get items by ID.
     * Throws if an item is missing.
     */
    getStrict: <Ids extends readonly string[]>(...ids: Ids) => { [K in keyof Ids]: T; };
};
