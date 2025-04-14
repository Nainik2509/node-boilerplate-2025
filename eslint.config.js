import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-plugin-prettier/recommended";

export default defineConfig([
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
      "no-console": "warn",
      "no-unused-vars": "warn",
      "no-var": "error",
      "prefer-const": "error",
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
  },
]);
