export function filter_keys<T, Key extends keyof T>(data: T,
                                                    include_keys: ReadonlyArray<Key>): Partial<T> {
    let result: Partial<T> = {};
    for (let key of include_keys) {
        result[key] = data[key];
    }
    return result;
}

// A wrapper around Object.assign that adds type checking to enforce
// that "to" is a derived class of "from".
// Also limits "from" to a single value.
// BEWARE: TYPESCRIPT HAS COVARIANT ARRAYS. You may need to add a private member variable
// to your classes if you want them to behave like nominal types. For example:
//      class Spam {
//          private _spam_brand: unknown;
//      }
export function safe_assign<ToType extends FromType, FromType>(to: ToType, from: FromType) {
    Object.assign(to, from);
}

// Sorts the given array in place by the "name" attribute of its elements.
export function sort_by_name<T extends {name: string}>(to_sort: T[]) {
    to_sort.sort((first: T, second: T) => first.name.localeCompare(second.name));
}

export function blob_to_string(blob: Blob): Promise<string> {
    let reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = () => {
            resolve(<string> reader.result);
        };

        /* istanbul ignore next */
        reader.onerror = () => {
            reader.abort();
            reject(new DOMException("Error converting blob to string."));
        };

        reader.readAsText(blob);
    });
}
