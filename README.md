# Autograder.io API Client

TypeScript API client for autograder.io. Can be installed via npm:
```
npm install ag-client-typescript
```

## Dev Setup
Requires Ubuntu 20.04 or later and Node 16 (newer versions might work).

### Recursively Clone the Repo
```
git clone --recursive https://github.com/eecs-autograder/ag-client-typescript.git
```

If you forgot the `--recursive` flag, initialize the submodule with:
```
git submodule update --init
```
You'll also need to rerun this command after pulling repository updates.

### Updating the autograder-server Submodule
If you are updating this library to include new changes to the autograder-server code, make sure the autograder-server submodule is up to date:
```
git submodule update --remote
```

Add and commit the autograder-server changes:
```
git add autograder-server
git commit
```

### Install Docker
Ubuntu: https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-docker-ce-1

### Generate GPG Secrets
First, install Python 3.10
```
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install python3.10 python3.10-distutils python3.10-venv
curl https://bootstrap.pypa.io/get-pip.py | sudo python3.10

python3.10 -m venv venv
source venv/bin/activate
```

Next, install the minimum dependencies needed to run generate_secrets.py:
```
python -m pip install --upgrade pip
python -m pip install Django==3.1 python-gnupg
```

Run the script:
```
cd autograder-server && python3 generate_secrets.py
```

### Build and Start Docker Stack
```
docker compose build
docker compose up -d
docker ps
```

### Apply Database Migrations
docker exec -it typescript-cli-django python3 manage.py migrate

### Install NPM Dependencies
```
npm ci
```

### Run Linters and Tests
Note: If you ran `npm run build` (for publishing new package versions), you will need to delete the "dist" folder, otherwise the linter will read the stale `.d.ts` files instead of the updated `.ts` files in the `src` directory.

Run the linters and test suite:
```
npm run lint
npm test
```
