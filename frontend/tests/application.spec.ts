import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function navigate(page: Page, name: string) {
  const toggle = page.getByRole('button', {name:'打开导航',exact:true});
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name,exact:true}).click();
}
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByText('当前方案满足所设约束',{exact:true})).toBeVisible();
}

test('opens a snapshot drawer, exports complete ledgers and restores the calculator', async ({page}) => {
  await ready(page);
  await expect(page.getByRole('heading',{name:'住房贷款与个人所得税联合计算器',exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/ningbo-chinese-${test.info().project.name}.png`,fullPage:false});
  await page.getByRole('spinbutton',{name:'每月绩效收入',exact:true}).fill('2000');
  await expect(page.getByText('输入已修改，下方仍展示上次计算结果。点击「开始计算」更新。')).toBeVisible();
  const response = page.waitForResponse(r=>r.url().endsWith('/api/calculate')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'开始计算',exact:true}).click();
  const data = await (await response).json();
  expect(data.summary.annualGrossIncome).toBe('444000.00');
  await page.getByRole('button',{name:'查看方案明细',exact:true}).click();
  await expect(page).toHaveURL(/#\/calculator$/);
  const drawer = page.getByRole('dialog', {name:'方案详情',exact:true});
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('cell',{name:'2026-12',exact:true})).toBeVisible();
  const exported = page.waitForEvent('download');
  await page.getByRole('button',{name:'导出明细 CSV',exact:true}).click();
  expect((await exported).suggestedFilename()).toContain('income.csv');
  await page.getByRole('tab',{name:'贷款还款计划',exact:true}).click();
  await expect(page.getByRole('columnheader',{name:'商贷本金',exact:true})).toBeVisible();
  const repaymentExport = page.waitForEvent('download');
  await drawer.getByRole('button',{name:'导出明细 CSV',exact:true}).click();
  const repaymentPath = await (await repaymentExport).path();
  const repaymentCsv = await readFile(repaymentPath!, 'utf8');
  expect(repaymentCsv.trim().split('\r\n')).toHaveLength(data.schedule.length + 1);
  expect(repaymentCsv.trim().split('\r\n').at(-1)).toMatch(/^"360",.*"0.00"$/);
  await page.getByRole('tab',{name:'现金流与公积金',exact:true}).click();
  await expect(page.getByRole('columnheader',{name:'公积金还贷提取',exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/plan-details-${test.info().project.name}.png`,fullPage:false});
  await page.emulateMedia({media:'print'});
  await expect(page.locator('#root')).toBeHidden();
  await expect(drawer).toBeVisible();
  const printedTable = await drawer.locator('.ant-table-content table').boundingBox();
  expect(printedTable!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.emulateMedia({media:'screen'});
  await drawer.getByRole('button',{name:'关闭详情',exact:true}).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('spinbutton',{name:'每月绩效收入',exact:true})).toHaveValue('2000.00');
  await expect(page.getByRole('button',{name:'查看方案明细',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});

test('keeps draft, navigation history and results through refresh and language changes', async ({page}) => {
  await ready(page);
  const salary = page.getByRole('spinbutton',{name:'税前月工资',exact:true});
  await salary.fill('31500');
  await page.getByRole('button',{name:'查看方案明细',exact:true}).click();
  await expect(page.getByRole('dialog').getByText('当前输入已修改，此处保留所选方案的计算快照。')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(salary).toHaveValue('31500.00');
  await navigate(page,'政策与计算方法');
  await expect(page).toHaveURL(/#\/policies$/);
  await page.goBack();
  await expect(salary).toHaveValue('31500.00');
  await page.reload();
  await expect(salary).toHaveValue('31500.00');
  await expect(page.getByText('输入已修改，下方仍展示上次计算结果。点击「开始计算」更新。')).toBeVisible();
  await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  await expect(page.getByRole('spinbutton',{name:'Gross monthly salary',exact:true})).toHaveValue('31500.00');
  await expect(page.getByRole('heading',{name:'Mortgage & Income Tax Calculator',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
  await page.getByRole('button',{name:'切换为中文',exact:true}).click();
  await page.goto('/#/repayment');
  await expect(page).toHaveURL(/#\/calculator$/);
  await expect(salary).toHaveValue('31500.00');
  const toggle=page.getByRole('button',{name:'打开导航',exact:true});
  if(await toggle.isVisible()) {await toggle.click();await page.keyboard.press('Escape');await expect(toggle).toBeFocused();}
});

test('optimizes, compares a recommendation, inspects it and applies its inputs', async ({page}) => {
  await ready(page);
  await page.getByRole('button',{name:'加入比较',exact:true}).click();
  await expect(page.getByText('方案已加入比较。',{exact:true})).toBeVisible();
  await navigate(page,'方案优化器');
  await page.getByRole('button',{name:'搜索可行方案',exact:true}).click();
  await expect(page.getByText('当前目标推荐',{exact:true})).toBeVisible({timeout:45000});
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`test-results/ningbo-recommendations-${test.info().project.name}.png`,fullPage:true});
  const before = await page.evaluate(()=>sessionStorage.getItem('homewise.v2.scenario'));
  await page.getByRole('button',{name:'查看方案明细',exact:true}).nth(1).click();
  const recommendation = page.getByRole('dialog', {name:'方案详情',exact:true});
  await expect(recommendation.getByText('推荐方案 2',{exact:true})).toBeVisible();
  await expect(page).toHaveURL(/#\/optimization$/);
  expect(await page.evaluate(()=>sessionStorage.getItem('homewise.v2.scenario'))).toBe(before);
  await recommendation.getByRole('button',{name:'关闭详情'}).click();
  await expect(recommendation).toBeHidden();
  await page.getByRole('button',{name:'加入比较',exact:true}).first().click();
  await navigate(page,'条件与方案比较');
  await expect(page.locator('.comparison-card')).toHaveCount(2);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/compare'));
  await page.getByRole('button',{name:'重新核对全部方案'}).click();
  expect((await response).ok()).toBeTruthy();
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`test-results/ningbo-saved-comparison-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'查看方案明细',exact:true}).last().click();
  await expect(page).toHaveURL(/#\/comparison$/);
  const comparison = page.getByRole('dialog', {name:'方案详情',exact:true});
  await expect(comparison.getByText('推荐方案 1',{exact:true})).toBeVisible();
  await comparison.getByRole('button',{name:'关闭详情'}).click();
  await expect(comparison).toBeHidden();
  await expect(page.locator('.comparison-card')).toHaveCount(2);
  await navigate(page,'方案优化器');
  await page.getByRole('button',{name:'应用此方案',exact:true}).first().click();
  await expect(page).toHaveURL(/#\/calculator$/);
  await expect(page.getByText('当前方案满足所设约束',{exact:true})).toBeVisible();
});

test('compares salary structures at fixed annual gross and exposes traceable sources', async ({page}) => {
  await ready(page);
  await navigate(page,'条件与方案比较');
  await page.getByRole('tab',{name:'条件调整',exact:true}).click();
  await page.getByRole('combobox',{name:'比较参数',exact:true}).press('ArrowDown');
  await page.getByText('奖金占年度收入比例',{exact:true}).last().click();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/scenario-changes'));
  await page.getByRole('button',{name:'计算条件变化'}).click();
  const data=await (await response).json();
  expect(data.points).toHaveLength(5);
  for(const point of data.points) expect(point.annualGrossIncome).toBe('420000.00');
  await expect(page.getByRole('heading',{name:'条件变化结果',exact:true})).toBeVisible();
  await navigate(page,'政策与计算方法');
  await expect(page.getByRole('heading',{name:'官方来源与适用说明',exact:true})).toBeVisible();
  await expect(page.locator('#policy-contribution')).toHaveAttribute('href',/^https:\/\/www.haishu.gov.cn/);
  await expect(page.getByText('官方说明已查阅；上限待复核',{exact:true})).toBeVisible();
});

test('reports no feasible candidates without creating a recommendation', async ({page}) => {
  await ready(page);
  await navigate(page,'方案优化器');
  await page.getByRole('spinbutton',{name:'最高可接受月供',exact:true}).fill('100');
  await page.getByRole('button',{name:'搜索可行方案',exact:true}).click();
  await expect(page.getByRole('heading',{name:'当前搜索范围内没有可行方案',exact:true})).toBeVisible({timeout:45000});
  await expect(page.getByRole('button',{name:'应用此方案',exact:true})).toHaveCount(0);
});

test('round-trips input snapshots and loads a help example into the calculator', async ({page}) => {
  await ready(page);
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出方案',exact:true}).click();
  const path=await (await download).path();
  const snapshot=JSON.parse(await readFile(path!,'utf8'));
  expect(snapshot.format).toBe('homewise-scenario-v2');
  expect(snapshot.calculation.input.city).toBe('NINGBO');
  snapshot.scenario.monthlySalary='31000';
  await page.getByLabel('导入方案文件').setInputFiles({name:'scenario.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});
  await expect(page.getByRole('spinbutton',{name:'税前月工资',exact:true})).toHaveValue('31000.00');
  await navigate(page,'使用帮助与项目说明');
  await expect(page.getByRole('heading',{name:'六人职责安排',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'查看方案明细',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'方案详情',exact:true})).toBeVisible();
  await expect(page).toHaveURL(/#\/help$/);
  await page.getByRole('button',{name:'关闭详情',exact:true}).click();
  await page.getByRole('button',{name:'加载此示例',exact:true}).nth(1).click();
  await expect(page.getByRole('spinbutton',{name:'税前月工资',exact:true})).toHaveValue('18000.00');
  await expect(page.getByText('当前方案满足所设约束',{exact:true})).toBeVisible();
});

test('all five English pages and plan details have formal translated copy and no page overflow', async ({page}) => {
  await ready(page);
  await expect(page.locator('img[src$="house-modern.svg"]')).toHaveCount(0);
  await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  await page.getByRole('button',{name:'View plan details',exact:true}).click();
  const drawer = page.getByRole('dialog',{name:'Plan details',exact:true});
  await expect(drawer).toBeVisible();
  expect(await drawer.innerText()).not.toMatch(/[\u3400-\u9fff]/);
  await drawer.getByRole('tab',{name:'Cash Flow & Provident Fund',exact:true}).click();
  expect(await drawer.innerText()).not.toMatch(/[\u3400-\u9fff]/);
  await drawer.getByRole('button',{name:'Close details',exact:true}).click();
  for(const route of ['calculator','optimization','comparison','policies','help']) {
    await page.goto(`/#/${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    // Await policy-backed content after reload, rather than testing an empty loading state.
    await expect(page.locator('.engine-state')).toContainText('connected');
    const text=await page.locator('main').innerText();
    expect(text,route).not.toMatch(/[\u3400-\u9fff]/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),route).toBeTruthy();
    await page.screenshot({path:`test-results/ningbo-${route}-${test.info().project.name}.png`,fullPage:true});
  }
});
