export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
type Migration<From extends JsonValue, To extends JsonValue> = (obj: From) => To;
type Function = (...args: any[]) => any;
type RecursiveFunctionDict = {
    [key: string]: Function | RecursiveFunctionDict;
};
export declare function createModel<T extends JsonValue, // Model type
S extends RecursiveFunctionDict, // Storage engine return type
M extends RecursiveFunctionDict>(modelName: string, getId: (obj: T) => string, storageEngine: (params: StorageEngineParams<T>) => S, utilitiesFactory?: (storageEngine: S) => M, migrations?: Migration<any, any>[]): M & S;
export type StorageEngineParams<T extends JsonValue> = {
    modelName: string;
    currentVersion: number;
    getId: (obj: T) => string;
    migrate: (prev: JsonValue, version: number) => T;
};
export {};
