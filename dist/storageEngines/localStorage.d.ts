type Test = {
    mama: number;
};
export declare const localStorageEngine: (modelName: string, modelVersion: number, getId: (obj: {
    [x: string]: any;
}) => string, migrate: (prev: {
    [x: string]: any;
}, version: number) => {
    [x: string]: any;
}) => {
    get(...ids: string[]): {
        [x: string]: any;
    }[];
    save(...objs: Test[]): void;
};
export {};
