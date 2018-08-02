export class APIObjectBase {
    constructor(public pk: number) {}

    // Saves the object to the API.
    async save(): Promise<void> {
        throw new UnsupportedOperationError;
    }

    // Reloads the object from the API.
    async refresh(): Promise<void> {
        throw new UnsupportedOperationError;
    }

    // Deletes the object. Note: not all objects support this operation.
    async delete(): Promise<void> {
        throw new UnsupportedOperationError;
    }
}

export class AGAPIError extends Error {}
export class UnsupportedOperationError extends AGAPIError {}
