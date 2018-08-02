import * as child_process from 'child_process';

import { HttpClient } from "src/http_client";

export function global_setup() {
    HttpClient.get_instance().defaults.baseURL = 'http://localhost:9000/api/';
    HttpClient.get_instance().defaults.headers = {
        // Note: Make sure the test server is using fake authentication.
        Cookie: 'username=jameslp@umich.edu'
    };

    child_process.spawnSync(
        'docker exec typescript-cli-django python3.6 manage.py migrate',
        {shell: true});
}

export function reset_db() {
    // If you add -it to the docker command, be sure to set
    // stdio to ['inherit', ...] for stdin.
    child_process.spawnSync(
        'docker exec typescript-cli-django python3.6 manage.py flush --no-input',
        {shell: true});
}

export function run_in_django_shell(python_str: string) {
    let result = child_process.spawnSync(
        'docker', ['exec', 'typescript-cli-django', 'python3.6', 'manage.py', 'shell',
                   '-c', python_str]);
    console.log(result.stdout.toString());
    console.log(result.stderr.toString());
}
