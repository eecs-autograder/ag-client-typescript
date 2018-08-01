import * as child_process from 'child_process';

export function reset_db() {
    // If you add -it to the docker command, be sure to set
    // stdio to ['inherit', ...] for stdin.
    child_process.spawnSync(
        'docker exec typescript-cli-django python3.6 manage.py flush --no-input',
        {shell: true});

    child_process.spawnSync(
        'docker exec typescript-cli-django python3.6 manage.py migrate',
        {shell: true});
}

export function run_in_django_shell(python_str: string) {
    let result = child_process.spawnSync(
        'docker', ['exec', '-it', 'typescript-cli-django', 'python3.6', 'manage.py', 'shell',
                   '-c', python_str],
        {stdio: ['inherit', 'pipe', 'pipe']}
    );
    console.log(result.stdout.toString());
    console.log(result.stderr.toString());
}
