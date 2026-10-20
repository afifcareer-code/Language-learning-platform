import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "database/migrations/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    // Architectural boundary: the core learning engine must stay language-agnostic
    // and framework-free. It may not import language modules, the database, or UI code.
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/languages/*", "@/languages/**"],
              message: "Core must not depend on language modules.",
            },
            { group: ["@/server/*", "@/server/**"], message: "Core must not depend on persistence." },
            {
              group: ["@/app/*", "@/components/*", "@/features/*", "react", "next", "next/*"],
              message: "Core must not depend on UI.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
