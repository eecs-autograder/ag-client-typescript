import { HttpClient } from "src/http_client";

export class User {
    static async get_current() {
        let response = await HttpClient.get_instance().get('/users/current/');
        console.log('waaaaaaaaa');
        console.log(response.data);
        console.log(response.status);
        console.log(response.statusText);
    }
}
