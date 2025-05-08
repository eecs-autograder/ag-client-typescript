#!/bin/bash

set -e  

if [ -z "$1" ]; then
    echo "Usage: $0 version"
    exit 1
fi

version=$1

# Updates package.json and package-lock.json
npm version "$version" --no-git-tag-version

git add package.json package-lock.json
git commit -m "Version $version"

git tag $version

echo "Run git push --tags to push the tag."

