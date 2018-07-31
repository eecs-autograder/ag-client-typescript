import { User } from "src/user";
import { build_server, start_server, destroy_server } from "tests/manage_server";

import { HttpClient } from "src/http_client";

test('wee', async () => {
    jest.setTimeout(10000);
    HttpClient.get_instance().defaults.baseURL = 'http://localhost:9000';
    // build_server();
    // await start_server();

    try {
        await User.get_current();
    }
    catch (e) {
        console.log(e);
        throw e;
    }
    // destroy_server();
});

