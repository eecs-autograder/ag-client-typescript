module.exports = {
    "roots": [
        "<rootDir>/src",
        "<rootDir>/tests",
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testMatch": ["**/test_*.ts", "test_*.ts"],
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx"
    ],
    "moduleDirectories": ["node_modules", "."],
    // The port should be the same as the one that the Django Docker container exposes.
    "testURL": "http://localhost:9000",

    cache: false,

    collectCoverage: true,
    collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
    coverageThreshold: {
        global: {
            branches: 95,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};
