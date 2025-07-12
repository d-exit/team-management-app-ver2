// utils/deepClone.ts
/**
 * Performs a deep copy of a given object. This is a safe replacement
 * for JSON.parse(JSON.stringify(obj)) that correctly handles Dates
 * and avoids other pitfalls of the JSON method.
 * @param obj The object to clone.
 * @returns A deep copy of the object.
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }

    if (Array.isArray(obj)) {
        const arrCopy: any[] = [];
        for (let i = 0; i < obj.length; i++) {
            arrCopy[i] = deepClone(obj[i]);
        }
        return arrCopy as any;
    }

    const objCopy: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            objCopy[key] = deepClone((obj as any)[key]);
        }
    }

    return objCopy as T;
}
