import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "legado", "node_modules", "playwright-report", "test-results"] },

  // Código do app (React, navegador).
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Sem eslint-plugin-react: marca como usadas as variáveis citadas em JSX.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // innerHTML é proibido no app (docs/ARQUITETURA.md).
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Sem innerHTML: monte o JSX." },
        { selector: "MemberExpression[property.name=/^(innerHTML|outerHTML)$/]", message: "Sem innerHTML: monte o JSX." }
      ]
    }
  },

  // Testes unitários (Vitest).
  {
    files: ["src/**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },

  // Configs e service worker.
  {
    files: ["*.config.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
    rules: js.configs.recommended.rules
  },
  {
    files: ["public/sw.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: globals.serviceworker },
    rules: js.configs.recommended.rules
  },

  // Testes e2e (Playwright, ESM).
  {
    files: ["coldtrack-qa/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node, ...globals.browser } },
    rules: js.configs.recommended.rules
  }
];
