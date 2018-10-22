import axios, { AxiosInstance } from "axios";

export class HttpClient {
    private static _instance: AxiosInstance | null = null;

    static get_instance(): AxiosInstance {
        if (HttpClient._instance === null) {
            HttpClient._instance = axios.create({
                baseURL: '/api/',
            });
        }
        return HttpClient._instance;
    }

    static set_base_url(base_url: string) {
        HttpClient.get_instance().defaults.baseURL = base_url;
    }

    static set_default_headers(headers: object) {
        HttpClient.get_instance().defaults.headers = headers;
    }

    // Uncomment this when we need it for production, and add a test case
    // so that the coverage checks pass.
    // static authenticate(auth_token: string) {
    //     HttpClient.get_instance().defaults.headers.common['Authorization']
    //          = `Token ${auth_token}`;
    // }
}
