import axios, { AxiosInstance } from "axios";

// Uncomment this when we need it for production, and add a test case
// so that the coverage checks pass.
// export function authenticate(auth_token: string) {
//     HttpClient.get_instance().defaults.headers.common['Authorization'] = `Token ${auth_token}`;
// }

export class HttpClient {
    private static _instance: AxiosInstance | null = null;

    static get_instance(): AxiosInstance {
        if (HttpClient._instance === null) {
            HttpClient._instance = axios.create({
                baseURL: 'https://autograder.io/api/',
            });
        }
        return HttpClient._instance;
    }
}
