import { HttpClient } from "src/http_client";

export function global_setup() {
    HttpClient.get_instance().defaults.baseURL = 'http://localhost:9000/api/';
    HttpClient.get_instance().defaults.headers = {
        // Note: Make sure the test server is using fake authentication.
        Cookie: 'username=jameslp@umich.edu'
    };
}
