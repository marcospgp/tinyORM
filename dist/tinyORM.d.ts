type Dict = Record<string, any>;
type FunctionDict = Record<string, (...args: any[]) => any>;
type Migration<From extends Dict, To extends Dict> = (obj: From) => To;
export declare function createModel<T extends Dict, // Model type
S extends FunctionDict, // Storage engine return type
M extends FunctionDict>(modelName: string, getId: (obj: T) => string, storageEngine: (params: StorageEngineParams<T>) => S, utilityMethods?: M, migrations?: Migration<any, any>[]): M & S;
export type StorageEngineParams<T extends Dict> = {
    modelName: string;
    modelVersion: number;
    getId: (obj: T) => string;
    migrate: (prev: Dict, version: number) => T;
};
export {};
