import { HttpClient } from "src/http_client";

export class Course {
    static async create(name: string) {
        let response = await HttpClient.get_instance().post('/courses/', {"name": name});
        console.log(response.data);
        console.log(response.status);
        console.log(response.statusText);
    }
}
