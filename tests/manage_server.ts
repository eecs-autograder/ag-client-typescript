import * as child_process from 'child_process';

const PROJ_ROOT = `${__dirname}/..`;

export function build_server() {
    child_process.spawnSync(
        'docker', ['build', '-t', 'typescript-cli-test-server', PROJ_ROOT],
        {stdio: 'inherit'});
}

export async function start_server() {
    child_process.spawnSync(
        'docker', ['run', '--name', 'cli-test-server',
                   '--env-file', `${PROJ_ROOT}/autograder-server/_dev.env`,
                   '-e', 'AG_DB_HOST=localhost',
                   '-e', 'AG_DB_PASSWORD=""',
                   '--ports', '9000:9000',
                   '-d', 'typescript-cli-test-server',
                   'python3.6', '/usr/src/app/manage.py', 'runserver', '9000'],
        {stdio: 'inherit'});
    child_process.spawnSync('docker', ['ps'], {stdio: 'inherit'});

    await timeout(3000);
}

export function destroy_server() {
    child_process.spawnSync('docker', ['rm', '-f', 'cli-test-server'], {stdio: 'inherit'});
    child_process.spawnSync('docker', ['ps'], {stdio: 'inherit'});
}

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
