import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Alert, App as AntApp, Button, Collapse, ConfigProvider, Empty, InputNumber, Modal, Segmented, Select, Skeleton, Spin, Switch, Tag, Tooltip, } from 'antd';
import { ArrowDownOutlined, ArrowRightOutlined, ArrowUpOutlined, BarChartOutlined, BookOutlined, BulbOutlined, CalculatorOutlined, CheckCircleFilled, CheckOutlined, DownloadOutlined, ExperimentOutlined, FileTextOutlined, HomeOutlined, InfoCircleOutlined, LineChartOutlined, LoadingOutlined, SafetyCertificateOutlined, SettingOutlined, UploadOutlined, } from '@ant-design/icons';
import type { EChartsOption } from 'echarts';
import Chart from './components/Chart';
import AppShell from './components/AppShell';
import ScenarioHero from './components/ScenarioHero';
import PlanDetailsDrawer from './components/PlanDetailsDrawer';
import ComparisonPage from './pages/ComparisonPage';
import HelpPage from './pages/HelpPage';
import { useRoute, useSessionState } from './navigation';
import type { SavedPlan } from './types';
import { useI18n } from './i18n';
import { api, download } from './api';
import { defaultScenario } from './types';
import type { CalculationResult, Example, OptimizationResult, Plan, Policy, RepaymentMethod, Scenario, } from './types';
const chartColors = ['#267e6d', '#c59660', '#7f9cbe', '#27495b'];
const chartBase = {
    color: chartColors,
    textStyle: { fontFamily: 'Inter, -apple-system, PingFang SC, sans-serif', color: '#73858b' },
    tooltip: { trigger: 'axis' as const, backgroundColor: '#fff', borderColor: '#e6eeeb', textStyle: { color: '#213b43' } },
    grid: { left: 14, right: 22, top: 40, bottom: 8, containLabel: true },
    legend: { type: 'scroll' as const, top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: '#7a8b90', fontSize: 11 } },
};
function NumericField({ label, value, onChange, suffix, min = '0', max, hint, percent = false, disabled = false }: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    suffix?: string;
    min?: string;
    max?: string;
    hint?: string;
    percent?: boolean;
    disabled?: boolean;
}) {
    const { t } = useI18n();
    return <label className="field">
    <span className="field-label">{label}{hint && <Tooltip title={hint}><InfoCircleOutlined aria-hidden="true" /></Tooltip>}</span>
    <InputNumber<string> aria-label={label} stringMode value={percent ? String(Number(value) * 100) : String(value)} min={min} max={max} controls={false} disabled={disabled} precision={percent ? 3 : 2} suffix={<span className="input-unit">{suffix ?? t('元')}</span>} onChange={(next) => { if (next !== null)
        onChange(percent ? String(Number(next) / 100) : next); }} style={{ width: '100%' }}/>
  </label>;
}
function ChoiceField({ label, children, hint }: {
    label: string;
    children: ReactNode;
    hint?: string;
}) {
    return <div className="field"><div className="field-label">{label}{hint && <Tooltip title={hint}><InfoCircleOutlined aria-hidden="true" /></Tooltip>}</div>{children}</div>;
}
function Panel({ title, eyebrow, extra, children, className = '' }: {
    title: string;
    eyebrow?: string;
    extra?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return <section className={`panel ${className}`}><div className="panel-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{extra}</div>{children}</section>;
}
function Metric({ title, value, foot, icon, tone = '' }: {
    title: string;
    value: string;
    foot: string;
    icon: ReactNode;
    tone?: string;
}) {
    return <div className={`metric ${tone}`}><div className="metric-heading"><span>{title}</span><span className="metric-icon">{icon}</span></div>
    <div className="metric-value"><span className="currency">¥</span>{value}</div><div className="metric-foot">{foot}</div></div>;
}
export default function App() {
    const { locale, t } = useI18n();
    const navItems = [
        { id: 'overview', label: t("联合计算器"), sub: 'CALCULATOR', icon: <CalculatorOutlined aria-hidden="true" /> },
        { id: 'optimize', label: t("方案优化器"), sub: 'PLAN EXPLORER', icon: <BarChartOutlined aria-hidden="true" /> },
        { id: 'sensitivity', label: t("条件与方案比较"), sub: 'WHAT IF', icon: <LineChartOutlined aria-hidden="true" /> },
        { id: 'policy', label: t("政策与计算方法"), sub: 'METHODOLOGY', icon: <BookOutlined aria-hidden="true" /> },
        { id: 'project', label: t("使用帮助与项目说明"), sub: 'PROJECT ROADMAP', icon: <ExperimentOutlined aria-hidden="true" /> },
    ];
    const money = (value: string | number | undefined, decimals = 0) => Number(value || 0).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const wan = (value: string | number | undefined) => t("{0} 万", [money(Number(value || 0) / 10000, 2)]);
    const methodLabel = (value: string) => value === 'ANNUITY' ? t("等额本息") : t("等额本金");
    const bonusLabel = (value: string) => value === 'SEPARATE' ? t("单独计税") : value === 'COMBINED' ? t("并入综合所得") : t("自动比较");
    const { message } = AntApp.useApp();
    const [page, setPage] = useRoute();
    const [scenario, setScenario] = useSessionState<Scenario>('scenario', defaultScenario);
    const [result, setResult] = useSessionState<CalculationResult | undefined>('result', undefined);
    const [policy, setPolicy] = useState<Policy>();
    const [examples, setExamples] = useState<Example[]>([]);
    const [healthy, setHealthy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
    const [detailIsCurrent, setDetailIsCurrent] = useState(false);
    useEffect(() => { setPlanDetailsOpen(false); }, [page]);
    const [optimization, setOptimization] = useSessionState<OptimizationResult | undefined>('optimization', undefined);
    const [optimizing, setOptimizing] = useState(false);
    const [optError, setOptError] = useState('');
    const [objective, setObjective] = useSessionState('objective','CASH_FLOW');
    const [minYears, setMinYears] = useSessionState('min-years',10);
    const [maxYears, setMaxYears] = useSessionState('max-years',30);
    const [pfStep, setPfStep] = useSessionState('pf-step','200000');
    const [comparisons, setComparisons] = useSessionState<SavedPlan[]>('comparisons', []);
    const [detailResult, setDetailResult] = useSessionState<CalculationResult | undefined>('detail-result', undefined);
    const [detailName, setDetailName] = useSessionState('detail-name', '当前方案');
    const [minPfAmount, setMinPfAmount] = useSessionState('min-pf','0');
    const [maxPfAmount, setMaxPfAmount] = useSessionState('max-pf','1000000');
    const [methods, setMethods] = useSessionState<RepaymentMethod[]>('methods',['ANNUITY', 'EQUAL_PRINCIPAL']);
    const importRef = useRef<HTMLInputElement>(null);
    const optimizeSequence = useRef(0);
    const calculateSequence = useRef(0);
    const hasBooted = useRef(false);
    useEffect(() => {
        if (page !== 'policy') return;
        const scroll = () => {
            const section = new URLSearchParams(window.location.hash.split('?')[1]).get('section');
            if (section) document.getElementById(`policy-${section}`)?.scrollIntoView({behavior:'smooth',block:'center'});
        };
        scroll(); window.addEventListener('hashchange',scroll);
        return () => window.removeEventListener('hashchange',scroll);
    }, [page, policy]);
    const dirty = Boolean(result && JSON.stringify(scenario) !== JSON.stringify(result.input));
    const update = <K extends keyof Scenario>(key: K, value: Scenario[K]) => setScenario((previous) => ({ ...previous, [key]: value }));
    async function calculate(input: Scenario = scenario) {
        const sequence = ++calculateSequence.current;
        setLoading(true);
        setError('');
        try {
            const data = await api<CalculationResult>('calculate', input);
            if (sequence !== calculateSequence.current) return;
            setResult(data);
            setScenario((current) => JSON.stringify(current) === JSON.stringify(input) ? data.input : current);
            setHealthy(true);
            return data;
        }
        catch (e) {
            if (sequence === calculateSequence.current) setError((e as Error).message);
        }
        finally {
            if (sequence === calculateSequence.current) setLoading(false);
        }
    }
    useEffect(() => {
        if (hasBooted.current)
            return;
        hasBooted.current = true;
        void api<{
            status: string;
        }>('health').then((v) => setHealthy(v.status === 'UP')).catch(() => setHealthy(false));
        void api<Policy>('policies').then(setPolicy).catch(() => { });
        void api<Example[]>('examples').then(setExamples).catch(() => { });
        if (!result) void calculate(scenario);
    }, []);
    async function optimize() {
        const sequence = ++optimizeSequence.current;
        setOptimizing(true);
        setOptError('');
        setOptimization(undefined);
        try {
            const data = await api<OptimizationResult>('optimize', {
                scenario, minYears, maxYears, yearStep: 1, pfStep, minPfAmount,
                maxPfAmount: scenario.pfEligible ? maxPfAmount : '0', methods, objective,
            });
            if (sequence !== optimizeSequence.current) return;
            setOptimization(data);
            setResult(data.baseline);
            setScenario(current=>JSON.stringify(current)===JSON.stringify(scenario)?data.baseline.input:current);
        }
        catch (e) {
            if (sequence === optimizeSequence.current) setOptError((e as Error).message);
        }
        finally {
            if (sequence === optimizeSequence.current) setOptimizing(false);
        }
    }
    function inspectCalculation(calculation: CalculationResult, name = '当前方案', isCurrent = false) {
        setDetailResult(calculation); setDetailName(name); setDetailIsCurrent(isCurrent); setPlanDetailsOpen(true);
    }
    async function inspectPlan(plan: Plan) {
        try { inspectCalculation(await api<CalculationResult>('calculate', plan.scenario), t('推荐方案 {0}', [plan.rank])); }
        catch (e) { message.error(t((e as Error).message)); }
    }
    async function addComparison(input: Scenario = scenario, name?: string) {
        if (comparisons.length >= 4) { message.info(t('最多比较四份方案，请先移除一份。')); return; }
        try {
            const calculation = await api<CalculationResult>('calculate', input);
            // LAN HTTP on a phone may not expose randomUUID; IDs are local labels, not credentials.
            const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setComparisons(previous => previous.length >= 4 ? previous : [...previous, {id, name: name || t('方案 {0}', [previous.length + 1]), calculation}]);
            message.success(t('方案已加入比较。'));
        } catch (e) { message.error(t((e as Error).message)); }
    }
    function editScenario(input: Scenario) {
        setScenario({...input}); setPage('overview'); void calculate(input);
    }
    function clearWorkspace() {
        optimizeSequence.current++; setOptimizing(false); setError(''); setOptError('');
        setObjective('CASH_FLOW'); setMinYears(10); setMaxYears(30); setPfStep('200000');
        setMinPfAmount('0'); setMaxPfAmount('1000000'); setMethods(['ANNUITY','EQUAL_PRINCIPAL']);
        setDetailName('当前方案'); setPlanDetailsOpen(false);
        setScenario({...defaultScenario}); setResult(undefined); setOptimization(undefined);
        setComparisons([]); setDetailResult(undefined); setPage('overview');
        for (const key of Object.keys(sessionStorage)) if (key.startsWith('homewise.v2.')) sessionStorage.removeItem(key);
        void calculate(defaultScenario);
    }
    async function applyPlan(plan: Plan) {
        setScenario(plan.scenario);
        await calculate(plan.scenario);
        setPage('overview');
        message.success(t("已将推荐参数应用到联合计算器，原搜索结果仍保留在方案优化器页面。"));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function exportJson() {
        download(JSON.stringify({ format: 'homewise-scenario-v2', exportedAt: new Date().toISOString(), scenario, calculation: !dirty ? result : undefined }, null, 2), t("衡居-方案快照.json"), 'application/json;charset=utf-8');
        message.success(t("方案已导出到本地文件。"));
    }
    async function importJson(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file)
            return;
        if (file.size > 2000000) {
            message.error(t("请选择小于 2 MB 的方案 JSON 文件。"));
            return;
        }
        try {
            const json = JSON.parse(await file.text());
            const input = json.scenario ?? json.input ?? json;
            if (!input || typeof input !== 'object' || !('monthlySalary' in input) || !('housePrice' in input))
                throw new Error(t("缺少工资或房价字段。"));
            const clean: Record<string, unknown> = { ...defaultScenario };
            for (const key of Object.keys(defaultScenario))
                if (Object.hasOwn(input, key))
                    clean[key] = input[key];
            setScenario(clean as unknown as Scenario);
            await calculate(clean as unknown as Scenario);
            setPage('overview');
        }
        catch (e) {
            message.error(t("导入失败：{0}", [(e as Error).message]));
        }
    }
    const cashOption = useMemo<EChartsOption>(() => ({
        ...chartBase,
        legend: { ...chartBase.legend, data: [t("工资到账"), t("房贷应还"), t("可支配结余")] },
        xAxis: { type: 'category', boundaryGap: false, data: result?.monthly.map((r) => t("{0}月", [r.month])) ?? [], axisLine: { lineStyle: { color: '#e3e9e8' } }, axisTick: { show: false }, axisLabel: { color: '#89969a', margin: 15 } },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => t("{0}万", [v / 10000]), color: '#89969a' }, splitLine: { lineStyle: { color: '#edf1ef', type: 'dashed' } } },
        series: [
            { name: t("工资到账"), type: 'line', smooth: false, showSymbol: false, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: '#93b1a8' }, data: result?.monthly.map((r) => Number(r.takeHome)) ?? [] },
            { name: t("房贷应还"), type: 'line', smooth: false, showSymbol: false, lineStyle: { width: 2 }, itemStyle: { color: '#c79967' }, data: result?.monthly.map((r) => Number(r.mortgagePayment)) ?? [] },
            { name: t("可支配结余"), type: 'line', smooth: false, symbolSize: 5, lineStyle: { width: 3 }, itemStyle: { color: '#287b6b' }, areaStyle: { color: newGradient() }, data: result?.monthly.map((r) => Number(r.disposableCash)) ?? [] },
        ],
    }), [result, locale]);
    const debtOption = useMemo<EChartsOption>(() => {
        const rows = result?.schedule.filter((r) => r.month === 1 || r.month % 12 === 0 || r.month === result.schedule.length) ?? [];
        return {
            ...chartBase, grid: { ...chartBase.grid, top: 24 }, legend: { show: false },
            tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => t("{0} 元", [money(Number(value))]) },
            xAxis: { type: 'category', data: rows.map((r) => r.month === 1 ? t("首月") : t("{0}年", [r.month / 12])), axisTick: { show: false }, axisLine: { lineStyle: { color: '#e3e9e8' } }, axisLabel: { interval: Math.max(0, Math.floor(rows.length / 5) - 1), color: '#89969a' } },
            yAxis: { type: 'value', axisLabel: { formatter: (v: number) => t("{0}万", [money(v / 10000)]) }, splitLine: { lineStyle: { color: '#edf1ef', type: 'dashed' } } },
            series: [{ name: t("剩余本金"), type: 'line', showSymbol: false, data: rows.map((r) => Number(r.remainingPrincipal)), lineStyle: { width: 2.5 }, areaStyle: { opacity: 0.06 } }],
        };
    }, [result, locale]);
    const inputForm = <section className="input-panel panel">
    <div className="panel-header"><div><div className="eyebrow">SCENARIO INPUTS</div><h2>{t("财务条件")}</h2></div><Tooltip title={t("输入保存在本标签页会话中，可导出或在帮助页清除；个人薪酬不写入服务器数据库。")}><SafetyCertificateOutlined className="muted-icon"/></Tooltip></div>
    <div className="scenario-label"><span className="city-dot"/>{t("宁波 ·")}{t("{0}年度",[scenario.taxYear])}<span>{t("居民个人 / 单一雇主")}</span></div>
    <Collapse ghost defaultActiveKey={['income', 'home']} items={[
            {
                key: 'income',
                label: <div className="collapse-title"><span className="step-number">01</span><span>{t("收入与扣除")}</span></div>,
                children: <div className="field-grid">
          <NumericField label={t("税前月工资")} value={scenario.monthlySalary} onChange={(v) => update('monthlySalary', v)}/>
          <NumericField label={t("每月绩效收入")} value={scenario.monthlyPerformance} onChange={(v) => update('monthlyPerformance', v)}/>
          <NumericField label={t("每月应税津贴")} value={scenario.monthlyAllowance} onChange={(v) => update('monthlyAllowance', v)}/>
          <NumericField label={t("全年一次性奖金")} value={scenario.annualBonus} onChange={(v) => update('annualBonus', v)}/>
          <ChoiceField label={t("奖金发放月份")}><Select aria-label={t("奖金发放月份")} value={scenario.bonusMonth} options={Array.from({ length: 12 }, (_, i) => ({ label: t("{0} 月", [i + 1]), value: i + 1 }))} onChange={(v) => update('bonusMonth', v)}/></ChoiceField>
          <ChoiceField label={t("奖金计税方式")}><Select aria-label={t("奖金计税方式")} value={scenario.bonusTaxMode} options={[{ label: t("自动比较 · 择低"), value: 'AUTO' }, { label: t("单独计税"), value: 'SEPARATE' }, { label: t("并入综合所得"), value: 'COMBINED' }]} onChange={(v) => update('bonusTaxMode', v)}/></ChoiceField>
          <NumericField label={t("其他月度专项附加扣除")} value={scenario.otherMonthlyDeductions} onChange={(v) => update('otherMonthlyDeductions', v)} hint={t("请输入已经确认符合资格的金额，不包含系统单独处理的房贷利息扣除。")}/>
          <ChoiceField label={t("奖金单独计税资格")}><Switch aria-label={t("奖金单独计税资格")} checked={scenario.bonusEligible} onChange={(v) => setScenario(previous => ({...previous, bonusEligible: v, bonusTaxMode: v ? previous.bonusTaxMode : 'COMBINED'}))}/></ChoiceField>
          <ChoiceField label={t("社保输入方式")}><Select aria-label={t("社保输入方式")} value={scenario.socialInsuranceMode} onChange={v=>update('socialInsuranceMode',v)} options={[{value:'CONFIRMED_AMOUNT',label:t("已确认月缴费额")},{value:'BASE_RATE',label:t("基数与比例")}]}/></ChoiceField>
          {scenario.socialInsuranceMode === 'CONFIRMED_AMOUNT' ? <NumericField label={t("个人社保月缴费额")} value={scenario.confirmedMonthlySocial} onChange={v=>update('confirmedMonthlySocial',v)} hint={t("填写工资单中已确认的个人社保合计；示例金额不代表当地统一标准。")}/> : <>
            <NumericField label={t("社保缴费基数")} value={scenario.socialInsuranceBase} onChange={v=>update('socialInsuranceBase',v)}/>
            <NumericField label={t("个人养老比例")} value={scenario.employeePensionRate} onChange={v=>update('employeePensionRate',v)} percent suffix="%"/>
            <NumericField label={t("个人医疗比例")} value={scenario.employeeMedicalRate} onChange={v=>update('employeeMedicalRate',v)} percent suffix="%"/>
            <NumericField label={t("个人失业比例")} value={scenario.employeeUnemploymentRate} onChange={v=>update('employeeUnemploymentRate',v)} percent suffix="%"/>
          </>}
        </div>,
            },
            {
                key: 'fund', label: <div className="collapse-title"><span className="step-number">02</span><span>{t("公积金账户")}</span></div>,
                children: <><div className="field-grid">
          <ChoiceField label={t("缴存区县")}><Select aria-label={t("缴存区县")} value={scenario.district} options={Object.entries(policy?.districts ?? {YINZHOU:'鄞州区'}).map(([value,label])=>({value,label:t(label)}))} onChange={v=>update('district',v)}/></ChoiceField>
          <NumericField label={t("公积金缴存基数")} value={scenario.pfBase} onChange={(v) => update('pfBase', v)}/>
          <NumericField label={t("期初公积金余额")} value={scenario.pfBalance} onChange={(v) => update('pfBalance', v)}/>
          <ChoiceField label={t("个人缴存比例")}><Select aria-label={t("个人缴存比例")} value={scenario.pfEmployeeRate} options={['0', '0.05', '0.06', '0.07', '0.08', '0.09', '0.10', '0.11', '0.12'].map((v) => ({ value: v, label: `${Number(v) * 100}%` }))} onChange={(v) => setScenario(previous=>({...previous,pfEmployeeRate:v,pfEmployerRate:v}))}/></ChoiceField>
          <ChoiceField label={t("单位缴存比例")}><Select aria-label={t("单位缴存比例")} value={scenario.pfEmployerRate} options={['0', '0.05', '0.06', '0.07', '0.08', '0.09', '0.10', '0.11', '0.12'].map((v) => ({ value: v, label: `${Number(v) * 100}%` }))} onChange={(v) => setScenario(previous=>({...previous,pfEmployeeRate:v,pfEmployerRate:v}))}/></ChoiceField>
          <NumericField label={t("连续缴存月数")} value={scenario.pfContributionMonths} onChange={v=>update('pfContributionMonths',Number(v))} suffix={t("月")} max="720"/>
          <NumericField label={t("已确认缴存基数上限")} value={scenario.confirmedPfBaseCeiling} onChange={v=>update('confirmedPfBaseCeiling',v)} hint={t("38907元为已查阅六月通知的临时参考；如有已确认的新标准，请更新此项。")}/>
          <NumericField label={t("已确认可贷上限")} value={scenario.pfLoanLimit} onChange={(v) => update('pfLoanLimit', v)} hint={t("请输入本人已确认的可贷额度；制度上限不等于个人审批额度。")}/>
          <ChoiceField label={t("公积金还贷使用")}><Select aria-label={t("公积金还贷使用")} value={scenario.providentUsage} options={[{ label: t("按月还贷提取测算"), value: 'MONTHLY_OFFSET' }, { label: t("不使用账户余额"), value: 'NONE' }]} onChange={(v) => update('providentUsage', v)}/></ChoiceField>
        </div><div className="toggle-row"><span>{t("已确认公积金贷款资格")}</span><Switch aria-label={t("已确认公积金贷款资格")} checked={scenario.pfEligible} onChange={(v) => update('pfEligible', v)} size="small"/></div><div className="toggle-row"><span>{t("首次使用公积金贷款")}</span><Switch aria-label={t("首次使用公积金贷款")} checked={scenario.firstPfLoan} onChange={v=>update('firstPfLoan',v)} size="small"/></div>
          <div className="toggle-row"><span>{t("已确认还贷提取条件")}</span><Switch aria-label={t("已确认还贷提取条件")} checked={scenario.pfWithdrawalConfirmed} onChange={v=>update('pfWithdrawalConfirmed',v)} size="small"/></div>
          <p className="field-note">{t("缴存比例5%–12%，单位与个人保持一致；首次首套普通最高160万元，实际额度还受余额和其他条件限制。")}</p><Button size="small" type="link" onClick={()=>setPage('policy?section=contribution')}>{t("查看缴存政策")}</Button></>,
            },
            {
                key: 'home', label: <div className="collapse-title"><span className="step-number">03</span><span>{t("购房与贷款")}</span></div>,
                children: <><div className="field-grid">
          <NumericField label={t("房屋总价")} value={scenario.housePrice} onChange={(v) => update('housePrice', v)}/>
          <NumericField label={t("首付比例")} value={scenario.downPaymentRate} onChange={(v) => update('downPaymentRate', v)} percent suffix="%" max="100"/>
          <NumericField label={t("公积金贷款金额")} value={scenario.pfLoanAmount} onChange={(v) => update('pfLoanAmount', v)}/>
          <ChoiceField label={t("贷款期限")}><Select aria-label={t("贷款期限")} value={scenario.loanYears} options={Array.from({ length: 30 }, (_, i) => ({ label: t("{0} 年", [i + 1]), value: i + 1 }))} onChange={(v) => update('loanYears', v)}/></ChoiceField>
          <NumericField label={t("商贷年利率")} value={scenario.commercialAnnualRate} onChange={(v) => update('commercialAnnualRate', v)} percent suffix="%" max="20"/>
          <NumericField label={t("公积金贷款年利率")} value={scenario.pfAnnualRate} onChange={(v) => update('pfAnnualRate', v)} percent suffix="%" max="20"/>
        </div>
          <ChoiceField label={t("还款方式")}><Segmented aria-label={t("还款方式")} block value={scenario.repaymentMethod} options={[{ label: t("等额本息"), value: 'ANNUITY' }, { label: t("等额本金"), value: 'EQUAL_PRINCIPAL' }]} onChange={(v) => update('repaymentMethod', v as RepaymentMethod)}/></ChoiceField>
          <div className="loan-preview"><span>{t("预计贷款总额")}</span><strong>¥ {money(Number(scenario.housePrice) * (1 - Number(scenario.downPaymentRate)))}</strong></div>
        </>,
            },
            {
                key: 'assumptions', label: <div className="collapse-title"><span className="step-number">04</span><span>{t("预算与测算假设")}</span></div>,
                children: <><div className="field-grid">
          <NumericField label={t("每月生活支出")} value={scenario.monthlyLivingCost} onChange={(v) => update('monthlyLivingCost', v)}/>
          <NumericField label={t("最低月度结余")} value={scenario.minMonthlyCash} onChange={(v) => update('minMonthlyCash', v)}/>
          <NumericField label={t("最高可接受月供")} value={scenario.maxMonthlyPayment} onChange={v=>update('maxMonthlyPayment',v)} hint={t("0表示不另设预算上限；仍检查其他约束。")}/>
          <NumericField label={t("已确认可贷期限")} value={scenario.confirmedMaxLoanYears} onChange={v=>update('confirmedMaxLoanYears',Number(v))} min="1" max="30" suffix={t("年")}/>
          <NumericField label={t("年折现率")} value={scenario.annualDiscountRate} onChange={(v) => update('annualDiscountRate', v)} percent suffix="%" max="30"/>
          <NumericField label={t("年通胀率")} value={scenario.annualInflationRate} onChange={(v) => update('annualInflationRate', v)} percent suffix="%" max="30"/>
          <NumericField label={t("已使用房贷扣除月数")} value={scenario.mortgageDeductionMonthsUsed} onChange={(v) => update('mortgageDeductionMonthsUsed', Number(v))} suffix={t("月")} max="240"/>
        </div>
          <div className="toggle-row"><span>{t("符合首套住房口径")}</span><Switch aria-label={t("符合首套住房口径")} checked={scenario.firstHome} onChange={(v) => update('firstHome', v)} size="small"/></div>
          <div className="toggle-row"><span>{t("符合住房贷款利息扣除条件")}</span><Switch aria-label={t("住房贷款利息扣除")} checked={scenario.mortgageDeduction} onChange={(v) => update('mortgageDeduction', v)} size="small"/></div>
          <p className="field-note">{t("房贷扣除减少应纳税所得额，不是每月直接减税 1,000 元。利率固定、年初开始还款，未来政策不自动外推。")}</p>
        </>,
            },
        ]}/>
    <div className="calculate-footer"><Button aria-label={t("开始计算")} type="primary" block size="large" icon={<CalculatorOutlined aria-hidden="true" />} loading={loading} onClick={() => void calculate()}>{t("开始计算")}</Button><Button type="text" onClick={()=>editScenario({...defaultScenario})}>{t("重置为示例")}</Button><span><SafetyCertificateOutlined aria-hidden="true" />{t("会话内保存 · 个人输入不写入数据库")}</span></div>
  </section>;
    function renderOverview() {
        return <>
      <ScenarioHero price={money(scenario.housePrice)} loan={money(Number(scenario.housePrice) * (1 - Number(scenario.downPaymentRate)))} years={scenario.loanYears} actions={<>
        <Button aria-label={t("导入方案")} icon={<UploadOutlined aria-hidden="true" />} onClick={() => importRef.current?.click()}>{t("导入方案")}</Button>
        <Button aria-label={t("导出方案")} icon={<DownloadOutlined aria-hidden="true" />} onClick={exportJson}>{t("导出方案")}</Button>
      </>} />
      <div className="context-bar"><div><span className="live-dot"/>{t("宁波 ·")}{scenario.taxYear}{t("年度测算")}<span className="bar-separator"/>{t("普通首套 · 单一借款人")}</div><Select aria-label={t("加载演示案例")} placeholder={t("加载示例方案")} value={undefined} variant="borderless" options={examples.map((e) => ({ label: t(e.name), value: e.id }))} onChange={(id) => { const e = examples.find((item) => item.id === id); if (e) {
            setScenario(e.scenario);
            void calculate(e.scenario);
        } }} style={{ minWidth: 190 }}/></div>
      <div className="calculator-layout">{inputForm}<div className="results-column">
        {error && <Alert type="error" showIcon closable onClose={() => setError('')} message={t("计算未完成")} description={t(error)} action={<Button size="small" onClick={() => void calculate()}>{t("重试")}</Button>}/>}
        {dirty && <Alert type="warning" showIcon message={t("输入已修改，下方仍展示上次计算结果。点击「开始计算」更新。")}/>}
        {!result && loading ? <div className="panel loading-panel"><Skeleton active paragraph={{ rows: 12 }}/></div> : result ? <>
          <Spin spinning={loading} indicator={<LoadingOutlined spin/>} tip={t("正在核对每月现金流…")}>
            <div className="metric-grid">
              <Metric title={t("年度还贷后现金")} value={money(result.summary.annualCashAfterMortgage)} foot={t("税后到账收入减房贷，加已确认还贷提取")} icon={<ArrowUpOutlined aria-hidden="true" />} tone="featured"/>
              <Metric title={t("首月房贷应还")} value={money(result.summary.firstMonthlyPayment)} foot={t("最高月供 ¥{0} · {1}", [money(result.summary.maxMonthlyPayment), methodLabel(result.summary.repaymentMethod)])} icon={<HomeOutlined aria-hidden="true" />}/>
              <Metric title={t("全年个人所得税")} value={money(result.summary.annualTax)} foot={t("奖金采用{0}", [bonusLabel(result.summary.bonusTaxMode)])} icon={<FileTextOutlined aria-hidden="true" />}/>
              <Metric title={t("贷款全期总利息")} value={money(result.summary.totalInterest)} foot={t("按当前利率不变计算 · 名义金额")} icon={<LineChartOutlined aria-hidden="true" />}/>
              <Metric title={t("年度税后到账收入")} value={money(result.summary.annualTakeHome)} foot={t("按实际预扣计入，不提前计入汇算退税")} icon={<FileTextOutlined aria-hidden="true" />}/>
              <Metric title={t("期末公积金余额")} value={money(result.summary.endingPfBalance)} foot={t("独立账户资产，不计入工资到账")} icon={<HomeOutlined aria-hidden="true" />}/>
            </div>
            <div className="result-actions"><Button onClick={()=>inspectCalculation(result, '当前方案', true)}>{t("查看方案明细")}</Button><Button onClick={()=>void addComparison()}>{t("加入比较")}</Button><Button onClick={()=>setDetailOpen(true)}>{t("计算依据")}</Button><Button onClick={()=>setPage('policy')}>{t("查看政策与方法")}</Button></div>
            <div className={`feasibility-strip ${result.feasible ? '' : 'is-warning'}`}>
              {result.feasible ? <CheckCircleFilled aria-hidden="true" /> : <InfoCircleOutlined aria-hidden="true" />}
              <div><strong>{result.feasible ? t("当前方案满足所设约束") : t("当前方案存在约束缺口")}</strong><span>{result.feasible ? t("最低月份结余 ¥{0}，高于设定下限 ¥{1}", [money(result.summary.minimumMonthlyCash), money(result.input.minMonthlyCash)]) : result.violations.map((value) => t(value)).join(locale === 'en' ? '; ' : '；')}</span></div>
              {result.feasible && <Tag bordered={false} color="success">{t("可行")}</Tag>}
            </div>
            <Panel title={t("年度现金流分析")} eyebrow="ANNUAL CASH FLOW" extra={<Tag bordered={false}>{t("{0}年度",[result.input.taxYear])}</Tag>}>
              <Chart option={cashOption} label={t("年度工资到账、房贷应还和可支配结余折线图")}/>
              <div className="chart-caption"><InfoCircleOutlined aria-hidden="true" />{t("可支配结余 = 工资到账 − 房贷应还 + 公积金还贷提取 − 生活支出。奖金发放月会影响曲线。")}</div>
            </Panel>
            <div className="two-panels">
              <Panel title={t("贷款余额变化")} extra={<span className="tiny-label">{t("全贷款期限")}</span>}><Chart option={debtOption} height={220} label={t("贷款全期剩余本金曲线")}/></Panel>
              <Panel title={t("年度收支构成")} className="breakdown-panel">
                <div className="breakdown-total"><span>{t("全年税前收入")}</span><strong>¥ {money(result.summary.annualGrossIncome)}</strong></div>
                <div className="breakdown-row"><span>{t("工资与奖金到账")}</span><strong>{money(result.summary.annualTakeHome)}</strong></div>
                <div className="breakdown-row"><span>{t("房贷应还总额")}</span><strong className="negative">− {money(result.summary.annualMortgagePayment)}</strong></div>
                <div className="breakdown-row"><span>{t("公积金还贷提取")}</span><strong className="positive">+ {money(result.summary.annualPfOffset)}</strong></div>
                <div className="breakdown-row"><span>{t("全年生活支出")}</span><strong className="negative">− {money(Number(result.input.monthlyLivingCost) * 12)}</strong></div>
                <div className="breakdown-row breakdown-final"><span>{t("可支配结余")}</span><strong>¥ {money(result.summary.annualDisposableCash)}</strong></div>
              </Panel>
            </div>
          </Spin>
          <div className="optimization-banner"><div className="banner-icon"><BulbOutlined aria-hidden="true" /></div><div><h3>{t("贷款方案优化器")}</h3><p>{t("在预算约束内，比较贷款期限、组合比例和还款方式。")}</p></div><Button type="primary" onClick={() => setPage('optimize')}>{t("进入方案优化器")}<ArrowRightOutlined aria-hidden="true" /></Button></div>
        </> : <Panel title={t("联合计算结果")}><Empty description={t("填写左侧信息，计算每个月的现金结余。")}/></Panel>}
      </div></div>
    </>;
    }
    function renderOptimize() {
        const baseline = optimization?.baseline.summary;
        const paretoOption: EChartsOption = {
            ...chartBase, grid: { ...chartBase.grid, top: 25, bottom: 30 }, legend: { show: false },
            tooltip: { trigger: 'item', formatter: (params: unknown) => { const p = params as {
                    data: number[];
                }; return t("总利息 {0} 万元<br/>年度结余 {1} 万元<br/>期限 {2} 年", [money(p.data[0], 2), money(p.data[1], 2), p.data[2]]); } },
            xAxis: { name: t("全期总利息 / 万元"), nameLocation: 'middle', nameGap: 32, type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#e8efec' } } },
            yAxis: { name: t("年度可支配结余 / 万元"), type: 'value', scale: true, splitLine: { lineStyle: { type: 'dashed', color: '#e8efec' } } },
            series: [{ type: 'scatter', symbolSize: 11, itemStyle: { color: '#287b6b', opacity: 0.8 }, data: optimization?.pareto.map((p) => [Number(p.totalInterest) / 10000, Number(p.annualDisposableCash) / 10000, p.loanYears]) ?? [] }],
        };
        return <>
      <div className="page-heading"><div><div className="eyebrow">HOMEWISE · OPTIMIZATION</div><h1>{t("贷款方案优化器")}<span className="heading-dot">.</span></h1><p>{t("在用户设定的范围和约束内，比较年度现金与贷款全期成本。")}</p></div><Button icon={<SettingOutlined aria-hidden="true" />} onClick={() => setPage('overview')}>{t("调整基础输入")}</Button></div>
      <div className="opt-layout"><Panel title={t("优化设置")} eyebrow="SEARCH SETTINGS">
        <ChoiceField label={t("优化目标")}><Select aria-label={t("优化目标")} value={objective} onChange={setObjective} options={[{ value: 'CASH_FLOW', label: t("年度还贷后现金最高") }, { value: 'INTEREST', label: t("全期总利息最低") }, { value: 'PRESENT_VALUE', label: t("融资付款现值最低") }]}/></ChoiceField>
        <div className="field-grid"><NumericField label={t("最短贷款期限")} value={minYears} onChange={(v) => setMinYears(Number(v))} min="1" max="30" suffix={t("年")}/><NumericField label={t("最长贷款期限")} value={maxYears} onChange={(v) => setMaxYears(Number(v))} min="1" max="30" suffix={t("年")}/></div>
        <NumericField label={t("公积金金额搜索步长")} value={pfStep} onChange={setPfStep} min="1000" suffix={t("元")}/>
        <div className="field-grid"><NumericField label={t("最低月度结余")} value={scenario.minMonthlyCash} onChange={(v) => update('minMonthlyCash', v)}/><NumericField label={t("每月生活支出")} value={scenario.monthlyLivingCost} onChange={(v) => update('monthlyLivingCost', v)}/></div>
        <div className="field-grid"><NumericField label={t("公积金贷款搜索下限")} value={minPfAmount} onChange={setMinPfAmount}/><NumericField label={t("公积金贷款搜索上限")} value={maxPfAmount} onChange={setMaxPfAmount}/></div>
        <NumericField label={t("最高可接受月供")} value={scenario.maxMonthlyPayment} onChange={v=>update('maxMonthlyPayment',v)} hint={t("0表示不另设预算上限；仍检查其他约束。")}/>
        <ChoiceField label={t("允许的还款方式")}><Select mode="multiple" aria-label={t("允许的还款方式")} value={methods} onChange={setMethods} options={[{value:'ANNUITY',label:t("等额本息")},{value:'EQUAL_PRINCIPAL',label:t("等额本金")}]}/></ChoiceField>
        <div className="search-facts"><div><span>{t("固定融资需求")}</span><strong>¥ {money(Number(scenario.housePrice) * (1 - Number(scenario.downPaymentRate)))}</strong></div><div><span>{t("公积金贷款上限")}</span><strong>¥ {money(scenario.pfEligible ? scenario.pfLoanLimit : '0')}</strong></div><div><span>{t("候选还款方式")}</span><strong>{t("等额本息 / 等额本金")}</strong></div></div>
        <Button type="primary" size="large" block icon={<ExperimentOutlined aria-hidden="true" />} loading={optimizing} onClick={() => void optimize()}>{t("搜索可行方案")}</Button>
        <p className="field-note">{t("薪酬、首付和缴存规则固定。最优结果仅针对展示的离散范围与步长，最多 2,500 个候选。")}</p>
        {dirty && <Alert type="info" showIcon message={t("搜索将使用当前已修改的输入。")}/>}
      </Panel>
      <div className="results-column">
        {optError && <Alert type="error" showIcon message={t("搜索未完成")} description={t(optError)}/>}
        {optimization && (JSON.stringify(scenario) !== JSON.stringify(optimization.baseline.input) || objective !== optimization.objective || minYears !== optimization.searchSettings.minYears || maxYears !== optimization.searchSettings.maxYears || Number(pfStep) !== Number(optimization.searchSettings.pfStep) || Number(minPfAmount) !== Number(optimization.searchSettings.minPfAmount) || Number(maxPfAmount) !== Number(optimization.searchSettings.maxPfAmount) || JSON.stringify(methods) !== JSON.stringify(optimization.searchSettings.methods)) && <Alert type="warning" showIcon message={t("输入已改变，下方保留上次搜索及其原方案。重新搜索可更新比较。")}/>}
        {optimizing && <div className="panel loading-panel"><Spin indicator={<LoadingOutlined spin/>}/><h3>{t("逐一核对候选方案")}</h3><p>{t("检查现金下限、公积金额度和每期账户余额。")}</p><Skeleton active paragraph={{ rows: 5 }}/></div>}
        {!optimization && !optimizing && <div className="empty-workspace"><div className="empty-orbit"><BarChartOutlined aria-hidden="true" /></div><h2>{t("优化结果")}</h2><p>{t("选择优化目标和搜索范围，系统将筛选满足约束的候选并返回最多三个推荐方案。")}</p><div className="empty-steps"><span><CheckOutlined aria-hidden="true" />{t("同一收入与首付")}</span><span><CheckOutlined aria-hidden="true" />{t("每月预算约束")}</span><span><CheckOutlined aria-hidden="true" />{t("可追溯的计算")}</span></div></div>}
        {optimization && <>
          <p className="result-meta">{t("搜索记录：{0}–{1}年；公积金{2}–{3}元，步长{4}元。", [optimization.searchSettings.minYears, optimization.searchSettings.maxYears, money(optimization.searchSettings.minPfAmount), money(optimization.searchSettings.maxPfAmount), money(optimization.searchSettings.pfStep)])}</p><div className="search-summary"><div><span>{t("已计算候选")}</span><strong>{optimization.evaluatedCount}</strong></div><div><span>{t("满足约束")}</span><strong className="positive">{optimization.feasibleCount}</strong></div><div><span>{t("因约束排除")}</span><strong>{optimization.rejectedCount}</strong></div><div><span>{t("本次耗时")}</span><strong>{money(optimization.elapsedMs)}<small> ms</small></strong></div></div>
          {optimization.status === 'NO_FEASIBLE' ? <Panel title={t("当前搜索范围内没有可行方案")}><Alert type="warning" showIcon message={t("请检查现金下限、首付与贷款额度。")} description={t("本次未找到符合全部约束的组合。可以调整可接受期限或最低结余后重新搜索。")}/><div className="reason-list">{Object.entries(optimization.rejectionReasons).map(([reason, count]) => <div key={t(reason)}><span>{t(reason)}</span><Tag>{count}{t("次")}</Tag></div>)}</div></Panel> : <>
            <div className="plan-cards">{optimization.plans.map((plan, index) => {
                        const delta = Number(plan.summary.annualDisposableCash) - Number(baseline?.annualDisposableCash || 0);
                        return <div className={`plan-card ${index === 0 ? 'best' : ''}`} key={plan.rank}><div className="plan-top"><span className="plan-rank">0{plan.rank}</span><Tag bordered={false} color={index === 0 ? 'green' : undefined}>{index === 0 ? t("当前目标推荐") : t("备选方案")}</Tag></div><h3>{plan.scenario.loanYears}{t("年 ·")}{methodLabel(plan.scenario.repaymentMethod)}</h3><div className="plan-sub">{t("公积金")}{wan(plan.scenario.pfLoanAmount)}{t("/ 商贷")}{wan(plan.summary.commercialPrincipal)}</div><div className="plan-value"><small>{t("年度可支配结余")}</small><strong>¥ {money(plan.summary.annualDisposableCash)}</strong></div><div className={`plan-delta ${delta < 0 ? 'negative' : 'positive'}`}>{delta >= 0 ? <ArrowUpOutlined aria-hidden="true" /> : <ArrowDownOutlined aria-hidden="true" />}{t("相比原方案")}{delta >= 0 ? '+' : '−'}¥{money(Math.abs(delta))}{t("/ 年")}</div><div className="plan-facts"><span>{t("首月应还")}<strong>¥{money(plan.summary.firstMonthlyPayment)}</strong></span><span>{t("全期利息")}<strong>{wan(plan.summary.totalInterest)}</strong></span><span>{t("最低月结余")}<strong>¥{money(plan.summary.minimumMonthlyCash)}</strong></span></div><Button block type={index === 0 ? 'primary' : 'default'} loading={loading} onClick={() => void applyPlan(plan)}>{t("应用此方案")}<ArrowRightOutlined aria-hidden="true" /></Button><div className="page-actions plan-secondary"><Button size="small" onClick={()=>void inspectPlan(plan)}>{t("查看方案明细")}</Button><Button size="small" disabled={comparisons.length>=4} onClick={()=>void addComparison(plan.scenario,t("推荐方案 {0}",[plan.rank]))}>{t("加入比较")}</Button></div><div className="plan-explanations">{plan.explanations.map((text, i) => <p key={i}>{t(text)}</p>)}</div></div>;
                    })}</div>
            <Panel title={t("年度现金与总利息比较")} eyebrow="PLAN TRADE-OFFS" extra={<Tag bordered={false}>{t("可行方案前沿")}</Tag>}><Chart option={paretoOption} height={300} label={t("可行方案帕累托前沿：总利息和年度现金结余散点图")}/><p className="chart-caption">{t("每个点代表一个可行组合。前沿保留无法同时进一步改善年度现金和总利息的方案；有限候选范围可能让部分点重合。")}</p></Panel>
          </>}
          <p className="result-meta">{t(optimization.searchDescription)}</p>
          <Alert type="info" showIcon message={t("现值口径")} description={t("付款现值包含首付和全期合同月供折现，属于融资付款成本，不等于长期净财富；不把公积金余额当作随时可用现金。")}/>
        </>}
      </div></div>
    </>;
    }
    function renderPolicy() {
        return <>
      <div className="page-heading"><div><div className="eyebrow">HOMEWISE · POLICIES</div><h1>{t("政策与计算方法")}<span className="heading-dot">.</span></h1><p>{t("规则、来源和测算边界保持透明。导出快照保留本次输入、结果与政策版本。")}</p></div><Tag bordered={false} color="green">{policy?.version || t("政策加载中")}</Tag></div>
      <div className="method-grid">
        <Panel title={t("当前支持范围")} eyebrow="SCOPE"><div className="scope-heading"><span className="scope-icon"><HomeOutlined aria-hidden="true" /></span><div><h3>{t(policy?.label) || t("宁波 · 普通首套住房联合测算")}</h3><p>{t("测算年度：")}{scenario.taxYear}{t("· 核对日期：")}{policy?.verifiedAt || t("以规则文件为准")}</p></div></div><p className="body-copy">{Array.isArray(policy?.scope) ? policy.scope.map((value) => t(value)).join(locale === 'en' ? '; ' : '；') : t(policy?.scope) || t("居民个人、全年单一雇主、工资薪金与一次性奖金、年初开始还款。")}</p><Alert type="info" showIcon message={t("测算不等于贷款审批")} description={t("个人缴存资格、实际贷款额度和产品报价由用户确认。当前模型不覆盖夫妻合贷、补充公积金、特殊额度上浮或银行全部审批条件。")}/></Panel>
        <Panel title={t("账户与现金流计算")} eyebrow="ACCOUNTING MODEL"><div className="formula-box"><span>{t("工资到账")}</span><p>{t("现金收入 − 社保 − 个人公积金 − 当月税款")}</p></div><div className="formula-box"><span>{t("可支配结余")}</span><p>{t("工资到账 − 房贷应还 + 公积金还贷提取 − 生活支出")}</p></div><div className="formula-box"><span>{t("公积金账户")}</span><p>{t("期初余额 + 双方缴存 − 还贷提取")}</p></div><p className="field-note">{t("单位缴存进入公积金账户；每笔还贷提取同时扣减账户余额，避免重复计入现金。")}</p></Panel>
      </div>
      {policy && <Alert type="info" showIcon message={t("政策核对状态")} description={t(policy.reviewStatus)}/>}
      <Panel title={t("计算方法")}><div className="assumption-grid">
        <div className="assumption"><span>{t("累计预扣：当月预扣税额依据累计应纳税所得额及此前已预扣税款计算；年度汇算单独列示。")}</span></div>
        <div className="assumption"><span>{t("等额本息：A = P × r × (1+r)^n ÷ ((1+r)^n−1)。r为月利率；零利率时A=P/n。")}</span></div>
        <div className="assumption"><span>{t("等额本金：每期本金约为P/n，利息为当期期初剩余本金乘月利率；最后一期调整分位尾差。")}</span></div>
        <div className="assumption"><span>{t("组合贷：两笔贷款分别计算本金、利息及余额，再按期合并；公积金还贷提取另记账户流转。")}</span></div>
        <div className="assumption"><span>{t("现金流优化：在固定购房融资需要下，枚举允许期限、贷款组合及还款方式，筛除约束不满足的方案并排序。")}</span></div>
        <div className="assumption"><span>{t("付款现值：首付加全部月供的折现值；通胀调整成本单独使用通胀率，不重复叠加折现。")}</span></div>
      </div></Panel>
      <Panel title={t("官方来源与适用说明")} eyebrow="POLICY REGISTER">
        {policy?.references.length ? <div className="reference-list">{policy.references.map((ref, i) => <a href={/^https?:\/\//.test(ref.url) ? ref.url : undefined} target="_blank" rel="noreferrer" className="reference-item" key={`${ref.url}-${i}`} id={`policy-${ref.id}`}><span className="reference-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{t(ref.title)}</h3><p>{t(ref.note)}</p><div className="policy-source-meta"><Tag>{t(ref.issuer)}</Tag><span>{t("生效日期：")}{ref.effectiveFrom}</span><span>{t(ref.reviewStatus)}</span></div><small>{ref.url ? (() => { try {
            return new URL(ref.url).hostname;
        }
        catch {
            return '';
        } })() : ''}</small></div><ArrowRightOutlined aria-hidden="true" /></a>)}</div> : <Empty description={t("暂未读取到政策来源，请确认后端服务已启动。")}/>}
      </Panel>
      <Panel title={t("测算假设与边界")}><div className="assumption-grid">{(policy?.assumptions || [t("贷款利率按输入值保持不变。"), t("全年工资和缴存基数保持输入口径，政策变更不自动外推。"), t("公积金还贷提取采用逐月模型，实际办理顺序以当地业务规则为准。")]).map((item, i) => <div className="assumption" key={i}><InfoCircleOutlined aria-hidden="true" /><span>{t(item)}</span></div>)}</div></Panel>
    </>;
    }
    return <ConfigProvider><AppShell page={page} onNavigate={setPage} items={navItems} healthy={healthy}>
        {page === 'overview' && renderOverview()}
        {page === 'optimize' && renderOptimize()}
        {page === 'sensitivity' && <ComparisonPage scenario={scenario} items={comparisons} onUpdate={setComparisons} onAdd={addComparison} onInspect={inspectCalculation} onEdit={editScenario} onNavigate={setPage}/>}
        {page === 'policy' && renderPolicy()}
        {page === 'project' && <HelpPage examples={examples} onLoad={editScenario} onNavigate={setPage} onClear={clearWorkspace} hasCalculation={Boolean(result)} onInspectCurrent={()=>{if(result) inspectCalculation(result, '当前方案', true);}}/>}
    <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={(e) => void importJson(e)} aria-label={t("导入方案文件")}/>
    <PlanDetailsDrawer open={planDetailsOpen} calculation={detailResult} name={detailName} dirty={dirty && detailIsCurrent} onClose={()=>setPlanDetailsOpen(false)} onNavigate={(next)=>{setPlanDetailsOpen(false);setPage(next);}}/>
    <Modal title={t("本次计算依据与快照")} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={<Button onClick={exportJson} icon={<DownloadOutlined aria-hidden="true" />}>{t("导出完整快照")}</Button>} width={760}>
      {result && <div className="calculation-details"><div className="detail-tags"><Tag>{t("政策")}{result.policyVersion}</Tag><Tag>{t("引擎")}{result.engineVersion}</Tag><Tag>{result.input.taxYear}{t("测算年度")}</Tag></div>
        <h3>{t("奖金比较")}</h3><div className="detail-grid"><div><span>{t("单独计税方案总税额")}</span><strong>¥ {money(result.bonusComparison.separateTax, 2)}</strong></div><div><span>{t("并入综合所得总税额")}</span><strong>¥ {money(result.bonusComparison.combinedTax, 2)}</strong></div></div><p>{t("采用：")}{bonusLabel(result.bonusComparison.selectedMode)}{t("。比较结果基于所选政策及收入输入。")}</p>
        <h3>{t("贷款付款成本")}</h3><div className="detail-grid"><div><span>{t("首付 + 月供现值")}</span><strong>¥ {money(result.summary.presentValueCost, 2)}</strong></div><div><span>{t("通胀调整付款成本")}</span><strong>¥ {money(result.summary.realPaymentCost, 2)}</strong></div></div><p>{t("融资付款口径，不含期末房产价值，不等于长期净财富。")}</p>
        <h3>{t("预扣与年度结算")}</h3><div className="detail-grid"><div><span>{t("当年实际预扣税款")}</span><strong>¥ {money(result.summary.annualWithheldTax, 2)}</strong></div><div><span>{t("预计汇算退税差额")}</span><strong>¥ {money(result.summary.annualSettlementRefund, 2)}</strong></div></div><p>{t("年度税额与实际预扣分别记录；尚未发生的汇算退税不提前计入本年度现金。")}</p>
        <h3>{t("测算假设")}</h3><ul className="plain-list">{result.assumptions.map((a, i) => <li key={i}>{t(a)}</li>)}</ul>
        {result.warnings.length > 0 && <><h3>{t("适用提醒")}</h3><ul className="plain-list">{result.warnings.map((a, i) => <li key={i}>{t(a)}</li>)}</ul></>}
      </div>}
    </Modal>
  </AppShell></ConfigProvider>;
}
function newGradient() {
    return { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(40,123,107,.18)' }, { offset: 1, color: 'rgba(40,123,107,.01)' }] };
}
