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
    moduleNameMapper: {
        '^@ag_cli/(.*)$': '<rootDir>/src/$1',
        '^@ag_cli/tests/(.*)$': '<rootDir>/tests/$1'

    },
    "testEnvironment": "node",

    "collectCoverage": true,
}
