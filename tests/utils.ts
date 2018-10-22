import * as child_process from 'child_process';

import { HttpClient } from "..";

export function global_setup() {
    HttpClient.set_base_url('http://localhost:9000/api/');
    HttpClient.set_default_headers({
        // Note: Make sure the test server is using fake authentication.
        Cookie: 'username=jameslp@umich.edu'
    });

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
    let stdout = result.stdout.toString();
    let stderr = result.stderr.toString();
    if (result.status !== 0) {
        console.log(result.status);
        console.log(stderr);
    }
    return {stdout: stdout, stderr: stderr, status: result.status};
}

export function make_superuser() {
    let make_superuser_code = `
from django.contrib.auth.models import User

user = User.objects.get_or_create(username='jameslp@umich.edu')[0]
user.is_superuser = True
user.save()
        `;

    run_in_django_shell(make_superuser_code);
}

export function do_editable_fields_test(ts_class: {EDITABLE_FIELDS: string[]},
                                        python_class_name: string) {
    let print_editable_fields = `
from autograder.core.models import Course
print('\\n'.join(${python_class_name}.get_editable_fields()))
    `;
    let output = run_in_django_shell(print_editable_fields).stdout.trim();
    let expected = output.split(/\s+/);
    expected.sort();
    let actual = ts_class.EDITABLE_FIELDS.slice();
    actual.sort();
    expect(actual).toEqual(expected);
}

export function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
