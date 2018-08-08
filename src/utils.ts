export function filter_keys<T, Key extends keyof T>(data: T, include_keys: Key[]): Partial<T> {
    let result: Partial<T> = {};
    for (let key of include_keys) {
        result[key] = data[key];
    }
    return result;
}

// A wrapper around Object.assign that adds type checking to enforce
// that "to" is a derived class of "from".
// Also limits "from" to a single value.
export function safe_assign<ToType extends FromType, FromType>(to: ToType, from: FromType) {
    Object.assign(to, from);
}
