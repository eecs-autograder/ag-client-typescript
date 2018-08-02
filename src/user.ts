import { HttpClient } from "./http_client";
import { APIObjectBase } from "./base";

export class User extends APIObjectBase {
    pk: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_superuser: boolean;

    constructor({pk,
                 username,
                 first_name = '',
                 last_name = '',
                 email = '',
                 is_superuser = false}: IUserCtor) {
        super(pk);
        this.pk = pk;
        this.username = username;
        this.first_name = first_name;
        this.last_name = last_name;
        this.email = email;
        this.is_superuser = is_superuser;
    }

    static async get_current(): Promise<User> {
        let response = await HttpClient.get_instance().get<IUser>('/users/current/');
        return new User(response.data);
    }

    static async get_by_pk(pk: number): Promise<User> {
        let response = await HttpClient.get_instance().get<IUser>(`/users/${pk}/`);
        return new User(response.data);
    }

    async refresh() {
        let response = await HttpClient.get_instance().get<IUser>(`/users/${this.pk}/`);
        Object.assign(this, response.data);
    }
}

interface IUser extends User {}
interface IUserCtor {
    pk: number;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    is_superuser?: boolean;
}
