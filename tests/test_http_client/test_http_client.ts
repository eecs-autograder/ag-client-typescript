/**
 * @jest-environment node
 */

import axios from "axios";
import * as child_process from 'child_process';

import { HttpClient, HttpError, HttpResponse } from "../../src/http_client";
import { sleep } from "../utils";

// IMPORTANT: The port in this url must match the port used in http_response_server.py
let base_url = 'http://localhost:9999/';
let server_process: child_process.ChildProcess | null = null;

beforeAll(async () => {
    axios.defaults.baseURL = base_url;
    server_process = child_process.spawn('python3', [`${__dirname}/http_response_server.py`]);
    let stderr = '';
    server_process.on('exit', (code) => {
        console.log('The server exited with status: ' + code);
        console.log(stderr);
    });
    server_process.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });
    let ready = false;
    let num_attempts = 0;
    await sleep(1);
    while (!ready && num_attempts < 3) {
        await sleep(1);
        try {
            let response = await axios.get('/', {timeout: 500});
            ready = response.status === 200;
        }
        catch (e) {
            console.log('Unable to connect to response server, sleeping...');
            num_attempts += 1;
        }
    }
    console.log(ready ? 'Server ready' : 'Max attempts to start the server reached');
    HttpClient.get_instance().set_base_url(base_url);
});

afterAll(async () => {
    return axios.post('/shutdown', {timeout: 1000});
});

describe('HttpResponse tests', () => {
    test('get()', async () => {
        let response = await HttpClient.get_instance().get('/?text="I am GET"');
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('I am GET');
        expect(response).toBeInstanceOf(HttpResponse);
    });

    test('post()', async () => {
        let response = await HttpClient.get_instance().post('/?status=201&text="I am POST"');
        expect(response.status).toEqual(201);
        expect(response.data).toEqual('I am POST');
        expect(response).toBeInstanceOf(HttpResponse);
    });

    test('put()', async () => {
        let response = await HttpClient.get_instance().put('/?text="I am PUT"');
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('I am PUT');
        expect(response).toBeInstanceOf(HttpResponse);
    });

    test('patch()', async () => {
        let response = await HttpClient.get_instance().patch('/?text="I am PATCH"');
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('I am PATCH');
        expect(response).toBeInstanceOf(HttpResponse);
    });

    test('delete()', async () => {
        let response = await HttpClient.get_instance().delete('/?text="I am DELETE"');
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('I am DELETE');
        expect(response).toBeInstanceOf(HttpResponse);
    });

    test('Upload and download progress params', async () => {
        let response = await HttpClient.get_instance().get(
            '/?text="I am GET"', {on_download_progress: () => {}});
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('I am GET');

        response = await HttpClient.get_instance().post(
            '/?status=201&text="I am POST"', {}, {on_upload_progress: () => {}});
        expect(response.status).toEqual(201);
        expect(response.data).toEqual('I am POST');

        response = await HttpClient.get_instance().put(
            '/?text="I am PUT"', {}, {on_upload_progress: () => {}});
        expect(response.status).toEqual(200);
        expect(response.data).toEqual('I am PUT');
    });
});

describe('HttpError tests', () => {
    test('Error thrown from get()', async () => {
        await expect_http_error(400, async () => {
            await HttpClient.get_instance().get('/?status=400');
        });
        await expect_http_error(403, async () => {
            await HttpClient.get_instance().get('/?status=403');
        });
        return expect_http_error(404, async () => {
            await HttpClient.get_instance().get('/?status=404');
        });
    });

    test('Error thrown from get_file()', async () => {
        await expect_http_error(400, async () => {
            await HttpClient.get_instance().get_file('/?status=400');
        });
        await expect_http_error(403, async () => {
            await HttpClient.get_instance().get_file('/?status=403');
        });
        return expect_http_error(404, async () => {
            await HttpClient.get_instance().get_file('/?status=404');
        });
    });

    test('Error thrown from post()', async () => {
        await expect_http_error(400, async () => {
            await HttpClient.get_instance().post('/?status=400');
        });
        await expect_http_error(403, async () => {
            await HttpClient.get_instance().post('/?status=403');
        });
        return expect_http_error(404, async () => {
            await HttpClient.get_instance().post('/?status=404');
        });
    });

    test('Error thrown from put()', async () => {
        await expect_http_error(400, async () => {
            await HttpClient.get_instance().put('/?status=400');
        });
        await expect_http_error(403, async () => {
            await HttpClient.get_instance().put('/?status=403');
        });
        return expect_http_error(404, async () => {
            await HttpClient.get_instance().put('/?status=404');
        });

    });

    test('Error thrown from patch()', async () => {
        await expect_http_error(400, async () => {
            await HttpClient.get_instance().patch('/?status=400');
        });
        await expect_http_error(403, async () => {
            await HttpClient.get_instance().patch('/?status=403');
        });
        return expect_http_error(404, async () => {
            await HttpClient.get_instance().patch('/?status=404');
        });
    });

    test('Error thrown from delete()', async () => {
        await expect_http_error(400, async () => {
            await HttpClient.get_instance().delete('/?status=400');
        });
        await expect_http_error(403, async () => {
            await HttpClient.get_instance().delete('/?status=403');
        });
        return expect_http_error(404, async () => {
            await HttpClient.get_instance().delete('/?status=404');
        });
    });

    test('HttpError toString', async () => {
        let error = new HttpError(400, {'field': 'Invalid!'});
        expect(error.toString()).toEqual('HTTP response status: 400\n{"field":"Invalid!"}');

        error = new HttpError(404, 'Not found u nub');
        expect(error.toString()).toEqual('HTTP response status: 404\n"Not found u nub"');
    });

    async function expect_http_error(expected_status: number, fn: () => Promise<void>) {
        try {
            await fn();
            fail('Error not thrown');
        }
        catch (e) {
            expect(e instanceof HttpError).toEqual(true);
            expect((<HttpError> e).status).toEqual(expected_status);
        }
    }
});
