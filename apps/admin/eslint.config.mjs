import { vue } from '@ranhduong/config/eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  vue,
  {
    // shared/ui, shared/lib phải chuyển được sang packages/ui (spec S28 mục 4.1): chỉ nhận props/slots, không phụ thuộc tầng trên hay API admin.
    files: ['src/shared/ui/**/*.{ts,vue}', 'src/shared/lib/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/entities/**', '@/features/**', '@/widgets/**', '@/pages/**', '@/shared/api/**'],
              message: 'shared/ui và shared/lib không import tầng trên hay API admin (spec S28 mục 4.1).',
            },
          ],
        },
      ],
    },
  },
]);
