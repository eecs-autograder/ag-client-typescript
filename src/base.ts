export class APIObjectBase {
    constructor(public pk: number) {}

    // Saves the object to the API.
    save(): void {
        throw new UnsupportedOperationError;
    }

    // Reloads the object from the API.
    refresh(): void {
        throw new UnsupportedOperationError;
    }

    // Deletes the object. Note: not all objects support this operation.
    delete(): void {
        throw new UnsupportedOperationError;
    }
}

export class AGAPIError extends Error {}
export class UnsupportedOperationError extends AGAPIError {}
