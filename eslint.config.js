const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
    {
        files: ["src/**/*.ts", "vitest.config.ts"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: false,
                sourceType: "module"
            }
        },
        plugins: {
            "@typescript-eslint": tsPlugin
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports"
                }
            ]
        }
    },
    eslintConfigPrettier
];