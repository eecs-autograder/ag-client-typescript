module.exports = {
    "roots": [
        "src",
        "tests",
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "(test_.*)|(test_.*\\.ts)$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx"
    ],
    "moduleDirectories": ["node_modules", "."],
    "testEnvironment": "node",

    "collectCoverage": true,
}
