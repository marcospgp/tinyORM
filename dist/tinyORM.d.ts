type Dict = Record<string, any>;
type FunctionDict = Record<string, (...args: any[]) => any>;
type Migration = (obj: Dict) => Dict;
export declare function createModel<T extends Record<string, any>, S extends Record<string, (...args: any[]) => any>, M extends Record<string, (...args: any) => any>>(modelName: string, getId: (obj: T) => string, storageEngine: StorageEngine<T, S>, methods?: M, migrations?: Migration[]): M & S & {
    create(obj: T): T;
};
type StorageEngine<T extends Dict, R> = (modelName: string, modelVersion: number, getId: (obj: T) => string, migrate: (prev: Dict, version: number) => T) => R;
/**
 * Helper function that allows defining storage engine function without having
 * to import types, by passing it in as a parameter.
 */
export declare function createStorageEngine<T extends Dict, R extends FunctionDict>(engine: StorageEngine<T, R>): StorageEngine<T, R>;
export {};
