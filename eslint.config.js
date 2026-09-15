import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.venv-stems/**",
      "**/.venv/**",
      "**/venv/**",
      "**/__pycache__/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-electron/**",
      "**/coverage/**"
    ]
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: [
      "**/*.ts",
      "**/*.tsx"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    }
  },

  {
    files: [
      "electron/**/*.js",
      "electron/**/*.mjs",
      "electron/**/*.cjs"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    }
  }
);