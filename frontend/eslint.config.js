const js = require("@eslint/js");
const globals = require("globals");
const react = require("eslint-plugin-react");
const hooks = require("eslint-plugin-react-hooks");
const a11y = require("eslint-plugin-jsx-a11y");

module.exports = [{
  files: ["src/**/*.{js,jsx}"],
  languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.jest, process: "readonly" } },
  plugins: { react, "react-hooks": hooks, "jsx-a11y": a11y },
  settings: { react: { version: "detect" } },
  rules: {
    ...js.configs.recommended.rules,
    ...hooks.configs.recommended.rules,
    ...a11y.configs.recommended.rules,
    "react/jsx-uses-vars": "error",
    "react/jsx-uses-react": "error",
    "no-unused-vars": ["error", { caughtErrors: "none" }],
    "no-empty": ["error", { allowEmptyCatch: true }],
  },
}];
