// Qualidade + fronteiras de camada (ADR-004) + proibições de domínio
// (ADR-001: sem literais de ponto flutuante em código financeiro).
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules', '.next', 'coverage', 'dist', 'public'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Domínio puro: nenhuma dependência externa, nenhum float (ADR-001/004).
    // Testes ficam de fora da proibição de float: constroem inputs
    // inválidos de propósito para provar a rejeição.
    files: ['src/domain/**/*.ts'],
    ignores: ['src/domain/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/application/*', '@/infrastructure/*', '@/ui/*', '@/app/*'],
              message: 'Domínio não importa camadas externas (ADR-004).',
            },
          ],
          paths: [],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[raw=/^\\d+\\.\\d+$/]',
          message:
            'Ponto flutuante proibido no domínio: dinheiro em centavos inteiros (ADR-001).',
        },
      ],
    },
  },
  {
    // Aplicação: importa apenas domínio (ADR-004)
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/infrastructure/*', '@/ui/*', '@/app/*'],
              message: 'Aplicação não importa infraestrutura nem UI (ADR-004).',
            },
          ],
        },
      ],
    },
  },
  {
    // UI não fura a arquitetura falando direto com a infraestrutura
    files: ['src/ui/**/*.ts', 'src/ui/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/infrastructure/supabase/repositories/*'],
              message:
                'UI consome services/hooks, não repositories (ADR-004).',
            },
          ],
        },
      ],
    },
  },
)
