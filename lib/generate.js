const mergeValue = require('./utils/mergeValue')
const writeFileTree = require('./utils/writeFileTree')
const mergeDeps = require('./utils/mergeDeps')
const configTransforms = require('./utils/configTransforms')
const sortObject = require('./utils/sortObject')
const path = require('path')
const fs = require('fs-extra')

module.exports = async function (context, { pkg, options }) {
  const { features } = options
  const useTs = features.includes('ts')
  const files = {}

  function extendPackage(fields, options) {
    const extendOptions = { merge: true, ...options }
    const toMerge = typeof fields === 'function' ? fields(pkg) : fields
    for (const key in toMerge) {
      const value = toMerge[key]
      const existing = pkg[key]
      if (typeof value === 'object' && (key === 'dependencies' || key === 'devDependencies')) {
        pkg[key] = mergeDeps(existing, value, extendOptions)
      } else if (!extendOptions.merge || !(key in pkg)) {
        pkg[key] = value
      } else {
        pkg[key] = mergeValue(value, existing)
      }
    }
  }

  const eslintConfig = {
    env: {
      browser: true,
      commonjs: true,
      es2021: true,
      node: true
    },
    extends: ['eslint:recommended', 'plugin:react/recommended'],
    parserOptions: {
      ecmaVersion: 12,
      ecmaFeatures: {
        jsx: true
      },
      sourceType: 'module'
    },
    plugins: ['react', 'react-hooks'],
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'no-console': 'off',
      'linebreak-style': 'off',
      'no-mixed-spaces-and-tabs': 'warn',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
      'react/prop-types': ['warn', { skipUndeclared: true }],
      'react/no-unescaped-entities': 'warn',
      'react/display-name': [0],
      'prefer-const': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error'
    },
    parser: 'babel-eslint'
  }

  const jestConfig = {
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
    testPathIgnorePatterns: ['/node_modules/']
  }

  const tsConfig = {
    compilerOptions: {
      module: 'commonjs',
      target: 'es5',
      sourceMap: true
    },
    exclude: ['node_modules']
  }

  const browsersList = {
    production: ['>0.2%', 'not dead', 'not op_mini all', 'chrome 68'],
    development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
  }

  const babelConfig = {
    presets: ['@babel/preset-env', '@babel/react'],
    plugins: [
      ['@babel/transform-runtime', { regenerator: true }],
      '@babel/proposal-optional-chaining',
      '@babel/proposal-nullish-coalescing-operator',
      '@babel/proposal-class-properties'
    ]
  }

  const prettierConfig = {
    printWidth: 100,
    semi: false,
    trailingComma: 'none',
    singleQuote: true
  }

  extendPackage({
    devDependencies: {
      'babel-eslint': '^10.1.0',
      'babel-loader': '^8.2.2',
      '@babel/core': '^7.12.10',
      '@babel/runtime': '^7.12.5',
      '@babel/preset-env': '^7.12.11',
      '@babel/preset-react': '^7.12.10',
      '@babel/plugin-transform-runtime': '^7.12.10',
      '@babel/plugin-proposal-class-properties': '^7.12.1',
      '@babel/plugin-proposal-nullish-coalescing-operator': '^7.12.1',
      '@babel/plugin-proposal-optional-chaining': '^7.12.7'
    }
  })
  //basic set up
  extendPackage({
    scripts: {
      start: 'cross-env NODE_ENV=development webpack serve',
      build: 'cross-env NODE_ENV=production webpack'
    },
    dependencies: {
      react: '^17.0.1',
      'react-dom': '^17.0.1'
    },
    devDependencies: {
      '@pmmmwh/react-refresh-webpack-plugin': '0.4.2',
      'react-refresh': '^0.9.0',
      'style-loader': '^2.0.0',
      postcss: '^8.2.4',
      'postcss-loader': '^4.2.0',
      'postcss-normalize': '^9.0.0',
      'postcss-preset-env': '^6.7.0',
      'postcss-flexbugs-fixes': '^5.0.2',
      'mini-css-extract-plugin': '^1.3.4',
      'cross-env': '^7.0.3',
      'css-loader': '^5.0.1',
      'url-loader': '^4.1.1',
      'copy-webpack-plugin': '^7.0.0',
      'html-webpack-plugin': '^5.0.0-beta.6',
      'clean-webpack-plugin': '^3.0.0',
      //webpack
      webpack: '^5.16.0',
      'webpack-cli': '^4.4.0',
      'webpack-dev-server': '3.11.2'
    }
  })
  if (features.includes('css-in-js')) {
    if (options.cssInJs === 'emotion') {
      babelConfig.presets.push('@emotion/babel-preset-css-prop')
      extendPackage({
        dependencies: {
          '@emotion/core': '^10.0.27',
          '@emotion/styled': '^10.0.27'
        },
        devDependencies: {
          '@emotion/babel-preset-css-prop': '^10.0.27'
        }
      })
    }
  }

  if (useTs) {
    extendPackage({
      devDependencies: {
        '@babel/preset-typescript': '^7.12.7'
      }
    })
    babelConfig.presets.push('@babel/preset-typescript')
  }

  if (features.includes('ui')) {
    if (options.uiLib === 'antd') {
      extendPackage({
        dependencies: {
          antd: '^4.11.1'
        }
      })
    }
  }

  if (features.includes('router')) {
    if (options.router === 'react-router-dom') {
      extendPackage({
        dependencies: {
          'react-router-dom': '^5.2.0'
        }
      })
    }
  }

  if (features.includes('css-preprocessor')) {
    if (options.cssPreprocessor === 'less') {
      extendPackage({
        dependencies: {
          less: '^4.1.0',
          'less-loader': '^7.3.0'
        }
      })
    }
  }

  if (features.includes('linter')) {
    if (options.eslintConfig === 'prettier') {
      extendPackage({
        scripts: { format: 'prettier --write .' },
        husky: {
          hooks: {
            'pre-commit': 'lint-staged'
          }
        },
        'lint-staged': {
          '*.{js,jsx,ts,tsx,md,html,css,less}': 'prettier --write',
          '*.{js,jsx,ts,tsx}': 'eslint --fix'
        },
        devDependencies: {
          eslint: '^7.18.0',
          'eslint-config-prettier': '^7.2.0',
          'eslint-plugin-react': '^7.22.0',
          'eslint-plugin-react-hooks': '^4.2.0',
          prettier: '^2.2.1',
          husky: '^4.3.8',
          'lint-staged': '^10.5.3'
        }
      })
      eslintConfig.extends.push('prettier')
      files['.prettierignore'] = configTransforms.lines.write({ value: ['dist', 'public'] })
    }
  }

  if (features.includes('unit')) {
    if (options.unit === 'jest') {
      extendPackage({
        scripts: { 'test:unit': 'jest' },
        devDependencies: {
          jest: '^26.6.3',
          'babel-jest': '^26.6.3',
          'eslint-plugin-jest': '^24.1.3',
          '@testing-library/react': '^11.2.3',
          '@testing-library/jest-dom': '^5.11.9'
        }
      })
      eslintConfig.plugins.push('jest')
      if (useTs) {
        extendPackage({
          devDependencies: {
            '@types/jest': '^26.0.20'
          }
        })
      }
      const jestSetupFile = useTs ? 'jest.setup.ts' : 'jest.setup.js'
      files[jestSetupFile] = `import '@testing-library/jest-dom'`
      tsConfig.include = [...(tsConfig.include ?? []), `./${jestSetupFile}`]
      jestConfig.setupFilesAfterEnv = [`<rootDir>/${jestSetupFile}`]
    }
  }

  if (features.includes('e2e')) {
    if (options.e2e === 'cypress') {
      extendPackage({
        scripts: { 'test:e2e': 'cypress open' },
        devDependencies: {
          cypress: '^6.3.0',
          'eslint-plugin-cypress': '^2.11.2',
          '@testing-library/cypress': '^7.0.3'
        }
      })
      eslintConfig.extends.push('plugin:cypress/recommended')
    }
  }

  function sortPkg() {
    // ensure package.json keys has readable order
    pkg.dependencies = sortObject(pkg.dependencies)
    pkg.devDependencies = sortObject(pkg.devDependencies)
    pkg.scripts = sortObject(pkg.scripts, [
      'start',
      'build',
      'test:unit',
      'test:e2e',
      'lint',
      'deploy'
    ])
    pkg = sortObject(pkg, [
      'name',
      'version',
      'private',
      'description',
      'author',
      'scripts',
      'main',
      'module',
      'browser',
      'files',
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'babel',
      'eslintConfig',
      'prettier',
      'postcss',
      'browserslist',
      'jest'
    ])
  }

  // generate files
  const browsers = Array.isArray(browsersList)
    ? browsersList
    : Object.entries(browsersList)
        .map(([key, val]) => [`[${key}]`, ...val])
        .flat()

  if (useTs) {
    files['tsconfig.json'] = configTransforms.json.write({ value: tsConfig })
  }
  if (options.useConfigFiles === 'files') {
    files['.browserslistrc'] = configTransforms.lines.write({ value: browsers })
    files['.eslintrc.js'] = configTransforms.js.write({ value: eslintConfig })
    files['babel.config.js'] = configTransforms.js.write({ value: babelConfig })
    if (options.unit === 'jest') {
      files['jest.config.js'] = configTransforms.js.write({ value: jestConfig })
    }
    if (options.eslintConfig === 'prettier') {
      files['.prettierrc.yml'] = configTransforms.yaml.write({ value: prettierConfig })
    }
  } else {
    const pkgConfig = {
      browserslist: browsersList,
      babel: babelConfig,
      eslintConfig
    }
    if (options.unit === 'jest') {
      pkgConfig.jest = jestConfig
    }
    if (options.eslintConfig === 'prettier') {
      pkgConfig.prettier = prettierConfig
    }
    extendPackage(pkgConfig)
  }
  sortPkg()
  files['package.json'] = configTransforms.json.write({ value: pkg })
  fs.copySync(path.resolve(__dirname, '../template'), context)
  await writeFileTree(context, files)
}
