import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
export default ts.config(
  { ignores: [".next/**", "node_modules/**", ".data/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["**/*.{tsx,jsx}"], plugins: { "react-hooks": hooks, "jsx-a11y": a11y }, rules: { ...hooks.configs.recommended.rules, ...a11y.configs.recommended.rules } }
);
