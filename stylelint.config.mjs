export default {
  extends: ['stylelint-config-standard', 'stylelint-config-css-modules'],
  ignoreFiles: ['node_modules/**', 'dist/**', 'coverage/**'],
  rules: {
    'selector-class-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
    'selector-pseudo-class-disallowed-list': ['disabled'],
    'media-feature-range-notation': 'prefix',
  },
  overrides: [
    {
      // Generated theme tokens intentionally repeat selectors and preserve palette precision.
      files: ['**/styles/theme.css'],
      rules: {
        'alpha-value-notation': null,
        'comment-empty-line-before': null,
        'custom-property-empty-line-before': null,
        'no-duplicate-selectors': null,
        'number-max-precision': null,
      },
    },
    {
      // Enforce design-token variable usage in component stylesheets.
      // global.css / base.css / colors.css may use hardcoded values in element resets.
      files: ['**/*.module.css'],
      rules: {
        'declaration-property-value-allowed-list': {
          // Font sizes must use a --text-* scale variable.
          'font-size': ['/var\\(--/', 'inherit', 'initial', 'unset', 'revert'],

          // Spacing shorthands: variable or a bare zero reset.
          '/^(padding|margin)$/': ['/var\\(--/', '0', 'inherit'],

          // Spacing logical longhands: variable, zero, or auto.
          '/^(padding|margin)-(block|inline)(-(start|end))?$/': [
            '/var\\(--/',
            '0',
            'auto',
            'inherit',
          ],

          // Gap: variable or zero.
          '/^(gap|row-gap|column-gap)$/': ['/var\\(--/', '0'],

          // Border radius: variable, zero, or 50% (circles/pills).
          'border-radius': ['/var\\(--/', '0', '50%', 'inherit'],
          '/^border-(start-start|start-end|end-start|end-end)-radius$/': [
            '/var\\(--/',
            '0',
            '50%',
            'inherit',
          ],

          // Transition timing must reference a variable. `none` is the only valid literal.
          // Note: the shorthand check requires `var(--` anywhere in the value string,
          // so mixed literals like `color 200ms ease` still fail.
          'transition-duration': ['/var\\(--/', '0s', '0ms'],
          transition: ['/var\\(--/', 'none', 'inherit'],
        },
      },
    },
  ],
};
