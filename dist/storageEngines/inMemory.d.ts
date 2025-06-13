type Dict = Record<string, any>;
export declare const inMemoryStorageEngine: (modelName: string, modelVersion: number, getId: (obj: {
    [x: string]: any;
}) => string, migrate: (prev: {
    [x: string]: any;
}, version: number) => {
    [x: string]: any;
}) => {
    get(rawId: string): {
        [x: string]: any;
    };
    save(...objs: Dict[]): void;
};
export {};
