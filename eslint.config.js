import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  // Base ignore patterns (replaces .eslintignore)
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/server/",
      "**/.env*",
      "**/*.log*",
      "**/coverage/",
      "**/.git/",
      "**/.vscode/",
      "**/.idea/",
      "**/.DS_Store",
    ],
  },

  // Base JS configuration
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
      sourceType: "module",
      ecmaVersion: "latest",
    },
  },

  // Prettier configuration
  prettier,

  // Custom rules
  {
    rules: {
      "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",
      "arrow-body-style": ["error", "as-needed"],
      eqeqeq: ["error", "always"],
    },
  },

  // Test files configuration
  {
    files: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
    },
  },
]);
