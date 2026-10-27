/** Offline translation and React server-render tests. No browser or user profile is accessed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { buildSync } = Module.createRequire(require.resolve('vite/package.json'))('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { App: AntApp } = require('antd');
const root = path.resolve(__dirname, '..');
const output = buildSync({
  stdin: {
    contents: "export {translate, I18nProvider} from './src/i18n'; export {default as App} from './src/App';",
    resolveDir: root, sourcefile: 'i18n-tests.tsx', loader: 'tsx',
  },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
  define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.VITE_API_BASE_URL': '""' },
}).outputFiles[0].text;
const filename = path.join(root, '.i18n-test-module.cjs');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(root);
loaded._compile(output, filename);
const { translate, I18nProvider, App } = loaded.exports;
const chinese = /[\u3400-\u9fff]/;

test('every UI translation key exists and preserves interpolation placeholders', () => {
  const dictionary = require('../src/locales/en.json');
  let count = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && ts.isStringLiteral(node.arguments[0])) {
      const key = node.arguments[0].text;
      if (chinese.test(key)) {
        assert.ok(Object.hasOwn(dictionary, key), `Missing key: ${key}`);
        assert.deepEqual((key.match(/\{\d+\}/g) || []).sort(), (dictionary[key].match(/\{\d+\}/g) || []).sort(), key);
        assert.ok(!chinese.test(dictionary[key]), key);
        count++;
      }
    }
    ts.forEachChild(node, visit);
  }
  const sourceRoot = path.join(root, 'src');
  for (const relative of fs.readdirSync(sourceRoot, { recursive: true }).filter((file) => file.endsWith('.tsx'))) {
    visit(ts.createSourceFile(relative, fs.readFileSync(path.join(sourceRoot, relative), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  }
  assert.ok(count > 300, `Only ${count} localized UI usages found`);
});

test('dynamic recommendations, errors and units keep financial values unchanged', () => {
  assert.equal(translate('en', '相比原方案，测算年度生活支出后现金变化 -53.35 元；全期总利息变化 19208.02 元。'), 'Compared with baseline, annual disposable cash changes by CNY -53.35; lifetime interest changes by CNY 19208.02.');
  assert.equal(translate('en', '期限 30 → 13 年，公积金贷款 1000000 → 800000.00 元。'), 'Loan term: 30 → 13 years. Provident-fund borrowing: CNY 1000000 → CNY 800000.00.');
  assert.equal(translate('en', '首付比例 超出允许范围 0–1'), 'Down payment is outside the permitted range 0–1');
  assert.equal(translate('en', '导入失败：{0}', ['请求格式错误']), 'Import failed: Invalid request format');
  assert.equal(translate('en', '至少一个月份的生活支出后现金低于最低保留金额；未声明满足公积金贷款资格'), 'At least one month has less cash after living expenses than the required minimum; Provident-fund loan eligibility has not been confirmed');
  assert.equal(translate('en', 'Unknown · message'), 'Unknown · message');
  assert.equal(translate('zh', '完整还款计划 · {0} 期', [360]), '完整还款计划 · 360 期');
});

for (const locale of ['zh', 'en']) {
  test(`the calculator server-renders offline in ${locale} with the language switch`, () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => locale } });
    try {
      const html = renderToStaticMarkup(React.createElement(I18nProvider, null, React.createElement(AntApp, null, React.createElement(App))));
      assert.ok(html.includes(locale === 'en' ? 'Gross monthly salary' : '税前月工资'));
      assert.ok(html.includes(locale === 'en' ? 'Calculate' : '开始计算'));
      assert.ok(html.includes('Switch to English'));
      assert.ok(html.includes('30000.00'));
      assert.ok(html.includes('language-switch'));
      if (locale === 'en') assert.ok(!chinese.test(html.replace(/aria-label="(?:Language \/ 语言|切换为中文)"/g, '').replace('>中文<', '><')), 'English calculator contains untranslated Chinese');
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else delete globalThis.localStorage;
    }
  });
}

test('English covers live policy, examples, recommendations, sensitivity and validation messages', { skip: !process.env.BASE_URL }, async () => {
  const base = process.env.BASE_URL.replace(/\/$/, '');
  async function request(route, body, expected = 200) {
    const response = await fetch(`${base}/api/${route}`, body === undefined ? {} : {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(response.status, expected, route);
    return response.json();
  }
  function verify(value, location) {
    if (typeof value === 'string' && chinese.test(value)) {
      assert.ok(!chinese.test(translate('en', value)), `Untranslated ${location}: ${value}`);
    } else if (Array.isArray(value)) {
      value.forEach((child, index) => verify(child, `${location}[${index}]`));
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        verify(key, `${location}.key`);
        verify(child, `${location}.${key}`);
      }
    }
  }
  const responses = await Promise.all([
    request('policies'), request('examples'), request('calculate', {}),
    request('optimize', { scenario: {}, minYears: 29, maxYears: 30 }),
    request('optimize', { scenario: { minMonthlyCash: '1000000' }, minYears: 30, maxYears: 30 }),
    request('sensitivity', { scenario: {} }),
    request('calculate', { monthlySalary: '-1' }, 400),
  ]);
  responses.forEach((response, index) => verify(response, `response[${index}]`));
});
