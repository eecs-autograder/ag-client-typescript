import { Refreshable } from "@ag_cli/base";
import { HttpClient } from "@ag_cli/http_client";
import { safe_assign } from "@ag_cli/utils";

export class UserData {
    pk: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_superuser: boolean;

    constructor({pk,
                 username,
                 first_name,
                 last_name,
                 email,
                 is_superuser}: UserData) {
        this.pk = pk;
        this.username = username;
        this.first_name = first_name;
        this.last_name = last_name;
        this.email = email;
        this.is_superuser = is_superuser;
    }
}

export class User extends UserData implements Refreshable {
    static async get_current(): Promise<User> {
        let response = await HttpClient.get_instance().get<UserData>('/users/current/');
        return new User(response.data);
    }

    static async get_by_pk(pk: number): Promise<User> {
        let response = await HttpClient.get_instance().get<UserData>(`/users/${pk}/`);
        return new User(response.data);
    }

    async refresh() {
        let response = await HttpClient.get_instance().get<UserData>(`/users/${this.pk}/`);
        safe_assign(this, response.data);
    }
}
