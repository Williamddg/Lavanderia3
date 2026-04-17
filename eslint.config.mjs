import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'dist-electron'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator='+'] Literal[value=/\\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\\b/i]",
          message:
            'No concatenes strings SQL manualmente. Usa query builder parametrizado (Kysely) o placeholders.'
        },
        {
          selector:
            "TemplateLiteral:not(TaggedTemplateExpression > TemplateLiteral) > TemplateElement[value.raw=/\\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\\b/i]",
          message:
            'Evita SQL literal crudo en templates; utiliza consultas parametrizadas o Kysely.'
        }
      ]
    }
  }
);
