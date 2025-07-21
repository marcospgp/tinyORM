/**
 * Hook factory to create hooks for storage models.
 * The resulting hooks allow components to use stored objects in their state.
 *
 * Feel free to copy and paste the following documentation comment into the
 * resulting hook function:
 *
/**
 * (This comment was copied from the definition for createStoredObjectsHook())
 *
 * Use objects in state, triggering a rerender if any other component updates
 * them.
 *
 * You can pass in:
 *
 * - nothing to get all objects
 * - a filter function to get a subset of all objects (this still fetches all
 *   objects, but avoids unnecessary rerenders by filtering out those the
 *   component doesn't care about)
 * - a list of object IDs (this avoids fetching all objects)
 * - TODO: limit fetch range by dates.
 *
 * Objects are cached in the following way:
 *
 * - Cache is global, with objects being shared between all components. No
 *   fetching is done unless the objects are not in cache or stale. Check
 *   implementation for max cache age.
 * - Requesting all objects will return the entire cache if all objects have
 *   already been requested less than max cache age ago, or fetch otherwise.
 * - Passing a filter function is similar to requesting all objects, only
 *   filtering the result.
 * - Requesting a list of object IDs will try the cache first, refetching any
 *   stale objects.
 */
export declare function createStoredObjectsHook<T extends Record<string, unknown>, C extends unknown[], U extends unknown[]>(uniqueId: string, storageFunctions: {
    getId: (obj: T) => string;
    create: (...args: C) => Promise<T>;
    get: (...ids: string[]) => Promise<Record<string, T>>;
    getAll: () => Promise<Record<string, T>>;
    update: (...args: U) => Promise<T>;
    delete: (...ids: string[]) => Promise<void>;
}, { cacheMaxAgeSeconds }?: {
    cacheMaxAgeSeconds?: number;
}): {
    (): {
        objs: Record<string, T>;
    } & {
        isLoading: boolean;
        update: (...args: U) => Promise<void>;
        create: (...args: C) => Promise<void>;
        delete: (...objs: T[]) => Promise<void>;
    };
    (filter: (obj: T) => boolean): {
        objs: Record<string, T>;
    } & {
        isLoading: boolean;
        update: (...args: U) => Promise<void>;
        create: (...args: C) => Promise<void>;
        delete: (...objs: T[]) => Promise<void>;
    };
    (id: string): {
        obj: T | null;
        id: string | null;
    } & {
        isLoading: boolean;
        update: (...args: U) => Promise<void>;
        create: (...args: C) => Promise<void>;
        delete: (...objs: T[]) => Promise<void>;
    };
    (ids: string[]): {
        objs: Record<string, T>;
    } & {
        isLoading: boolean;
        update: (...args: U) => Promise<void>;
        create: (...args: C) => Promise<void>;
        delete: (...objs: T[]) => Promise<void>;
    };
};
