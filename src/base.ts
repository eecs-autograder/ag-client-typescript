export interface UnsavedAPIObject {
    create(): Promise<SaveableAPIObject>;
}

export interface SaveableAPIObject extends Refreshable {
    pk: number;
    save(): Promise<void>;
}

export interface Refreshable {
    refresh(): Promise<void>;
}

export interface Deletable {
    delete(): Promise<void>;
}
