export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
type Migration<From extends JsonValue, To extends JsonValue> = (obj: From) => To;
type Function = (...args: any[]) => any;
export type RecursiveFunctionDict = {
    [key: string]: Function | RecursiveFunctionDict;
};
export declare function createModel<T extends JsonValue, S extends RecursiveFunctionDict, M extends RecursiveFunctionDict>(modelName: string, 
/**
 * Annotating the obj parameter in this callback with the intended type will
 * make typescript infer it as the type for this model.
 * Specifying the type with the generic syntax (createModel<T>()) is not
 * practical as there are other generic type parameters, and all must be
 * either inferred or manually specified at once.
 */
getId: (obj: T) => string, storageEngine: StorageEngine<T, S>, methodsFactory: (storageMethods: S) => M, migrations?: Migration<any, any>[]): M;
type StorageEngine<T extends JsonValue, R extends RecursiveFunctionDict> = (params: StorageEngineParams<T>) => R;
export type StorageEngineParams<T> = {
    modelName: string;
    currentVersion: number;
    getId: (obj: T) => string;
    migrate: (prev: JsonValue, version: number) => T;
};
export {};
