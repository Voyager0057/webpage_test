import { useState } from 'react';
import { Alert, Button, Empty, Input, Select, Skeleton, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import Chart from '../components/Chart';
import PageHeading from '../components/PageHeading';
import { useI18n } from '../i18n';
import { useSessionState } from '../navigation';
import { api, download, toCsvCell } from '../api';
import type { CalculationResult, SavedPlan, Scenario, SensitivityResult, Summary } from '../types';

export default function ComparisonPage({ scenario, items, onUpdate, onAdd, onInspect, onEdit, onNavigate }: {
  scenario: Scenario; items: SavedPlan[]; onUpdate: (items: SavedPlan[]) => void;
  onAdd: (scenario: Scenario, name?: string) => Promise<void>;
  onInspect: (result: CalculationResult, name: string) => void;
  onEdit: (scenario: Scenario) => void; onNavigate: (page: string) => void;
}) {
  const {t, locale} = useI18n();
  const [tab,setTab] = useSessionState('comparison-tab','plans');
  const [parameter,setParameter] = useSessionState('comparison-parameter','commercialAnnualRate');
  const [changes,setChanges] = useSessionState<SensitivityResult | undefined>('comparison-changes',undefined);
  const [input,setInput] = useSessionState<Scenario | undefined>('comparison-input',undefined);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const money = (v: unknown) => Number(v ?? 0).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2});
  const labels: Record<string,string> = {commercialAnnualRate:t('商业贷款年利率'), monthlySalary:t('税前月工资'), pfLoanAmount:t('公积金贷款金额'),loanYears:t('贷款期限'),bonusShare:t('奖金占年度收入比例')};
  const metrics: {key: keyof Summary; label: string}[] = [
    {key:'annualGrossIncome',label:t('全年税前收入')},{key:'annualTakeHome',label:t('年度税后到账收入')},
    {key:'annualTax',label:t('年度个人所得税')},{key:'firstMonthlyPayment',label:t('首月房贷应还')},
    {key:'maxMonthlyPayment',label:t('最高月供')},{key:'annualCashAfterMortgage',label:t('年度还贷后现金')},
    {key:'annualDisposableCash',label:t('年度可支配结余')},{key:'totalInterest',label:t('全期总利息')},
    {key:'endingPfBalance',label:t('期末公积金余额')},{key:'presentValueCost',label:t('首付 + 月供现值')},
    {key:'realPaymentCost',label:t('通胀调整付款成本')},
  ];
  type Row = {key: string; label: string; values: string[]};
  const rows: Row[] = [
    {key:'term',label:t('贷款期限'),values:items.map(p=>t('{0} 年',[p.calculation.input.loanYears]))},
    {key:'method',label:t('还款方式'),values:items.map(p=>p.calculation.input.repaymentMethod==='ANNUITY'?t('等额本息'):t('等额本金'))},
    {key:'salary',label:t('税前月工资'),values:items.map(p=>`¥ ${money(p.calculation.input.monthlySalary)}`)},
    {key:'bonus',label:t('全年一次性奖金'),values:items.map(p=>`¥ ${money(p.calculation.input.annualBonus)}`)},
    {key:'fund',label:t('公积金贷款金额'),values:items.map(p=>`¥ ${money(p.calculation.input.pfLoanAmount)}`)},
    {key:'commercial',label:t('商业贷款金额'),values:items.map(p=>`¥ ${money(p.calculation.summary.commercialPrincipal)}`)},
    ...metrics.map(m=>({key:m.key,label:m.label,values:items.map(p=>`¥ ${money(p.calculation.summary[m.key])}`)})),
    {key:'delta',label:t('还贷后现金相对基准差额'),values:items.map((p,i)=>i===0?'—':`¥ ${money(Number(p.calculation.summary.annualCashAfterMortgage)-Number(items[0].calculation.summary.annualCashAfterMortgage))}`)},
  ];
  const columns: ColumnsType<Row> = [{title:t('比较指标'),dataIndex:'label',fixed:'left',width:190},...items.map((plan,i)=>({title:<span>{t(plan.name)}{i===0&&<Tag>{t('基准')}</Tag>}</span>,key:plan.id,width:225,render:(_:unknown,row:Row)=>row.values[i]}))];
  async function runChanges() {
    setBusy(true);setError('');
    const values = parameter==='commercialAnnualRate' ? [-.01,-.005,0,.005,.01].map(d=>Math.max(0,Number(scenario.commercialAnnualRate)+d).toFixed(4))
      : parameter==='monthlySalary' ? [.8,.9,1,1.1,1.2].map(d=>(Number(scenario.monthlySalary)*d).toFixed(2))
      : parameter==='pfLoanAmount' ? [0,.25,.5,.75,1].map(d=>(Math.min(Number(scenario.pfLoanLimit),Number(scenario.housePrice)*(1-Number(scenario.downPaymentRate)))*d).toFixed(2))
      : parameter==='bonusShare' ? ['0','.1','.2','.3','.4'] : ['10','15','20','25','30'];
    try {const r = await api<SensitivityResult>('scenario-changes',{scenario,parameter,values:[...new Set(values)]});setChanges(r);setInput({...scenario});}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function refreshPlans() {
    setBusy(true);setError('');
    try {onUpdate(await api<SavedPlan[]>('compare',{scenarios:items.map(p=>({id:p.id,name:p.name,scenario:p.calculation.input}))}));}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function exportComparison() {download('\uFEFF'+[[t('比较指标'),...items.map(p=>t(p.name))],...rows.map(r=>[r.label,...r.values])].map(r=>r.map(toCsvCell).join(',')).join('\r\n'),'homewise-comparison.csv','text/csv;charset=utf-8');}
  function valueLabel(v:string) {return changes?.parameter==='loanYears'?t('{0} 年',[v]):['bonusShare','commercialAnnualRate'].includes(changes?.parameter??'')?`${money(Number(v)*100)}%`:`¥ ${money(v)}`;}
  return <>
    <PageHeading title={t('条件与方案比较')} description={t('比较收入安排、贷款期限和融资组合，并保留每份方案的独立计算结果。')} actions={<Button onClick={()=>onNavigate('overview')}>{t('调整基础输入')}</Button>} />
    {error&&<Alert type="error" showIcon message={t('比较未完成')} description={t(error)} />}
    <Tabs activeKey={tab} onChange={setTab} items={[{key:'plans',label:t('方案比较')},{key:'changes',label:t('条件调整')}]} />
    {tab==='plans'?<>
      <section className="panel"><div className="panel-header"><h2>{t('已保存的比较方案')}</h2><div className="page-actions"><Button disabled={items.length>=4} onClick={()=>void onAdd(scenario)}>{t('加入当前方案')}</Button><Button disabled={!items.length} loading={busy} onClick={()=>void refreshPlans()}>{t('重新核对全部方案')}</Button><Button disabled={!items.length} icon={<DownloadOutlined aria-hidden="true" />} onClick={exportComparison}>{t('导出比较 CSV')}</Button></div></div>
      <p className="field-note">{t('最多比较四份方案，第一份为基准。修改名称不会改变计算结果；移除首份后下一份成为基准。')}</p>
      {!items.length?<Empty description={t('从联合计算或方案优化加入方案。')} />:<>
        <div className="comparison-cards">{items.map((p,i)=><article className="comparison-card" key={p.id}>
          <Input aria-label={t('方案 {0} 名称',[i+1])} value={t(p.name)} maxLength={80} onChange={e=>onUpdate(items.map(x=>x.id===p.id?{...x,name:e.target.value}:x))} />
          <div className="detail-tags"><Tag color={p.calculation.feasible?'success':'warning'}>{p.calculation.feasible?t('满足约束'):t('存在缺口')}</Tag><Tag>{p.calculation.policyVersion}</Tag></div>
          <p>{t('{0}年贷款，{1}',[p.calculation.input.loanYears,p.calculation.input.repaymentMethod==='ANNUITY'?t('等额本息'):t('等额本金')])}</p>
          <div className="page-actions"><Button size="small" onClick={()=>onInspect(p.calculation,p.name)}>{t('查看方案明细')}</Button><Button size="small" onClick={()=>onEdit(p.calculation.input)}>{t('编辑方案')}</Button><Button size="small" danger icon={<DeleteOutlined />} aria-label={t('移除方案 {0}',[i+1])} onClick={()=>onUpdate(items.filter(x=>x.id!==p.id))} /></div>
          {!p.calculation.feasible&&<p className="field-note negative">{p.calculation.violations.map(v=>t(v)).join('; ')}</p>}
        </article>)}</div>
        <Table<Row> columns={columns} dataSource={rows} rowKey="key" pagination={false} scroll={{x:190+items.length*225}} size="middle" />
        <p className="field-note">{t('年度现金与贷款全期成本分别展示。不同收入总额、首付或政策版本的方案不应直接归因为融资结构改善。')}</p>
      </>}
      </section>
    </>:<>
      <section className="panel"><div className="panel-header"><h2>{t('选择比较条件')}</h2><Tag>{t('基于当前输入')}</Tag></div>
        <div className="sensitivity-toolbar"><Select aria-label={t('比较参数')} value={parameter} onChange={setParameter} options={Object.entries(labels).map(([value,label])=>({value,label}))} /><Button type="primary" loading={busy} onClick={()=>void runChanges()}>{t('计算条件变化')}</Button></div>
        <p className="field-note">{parameter==='bonusShare'?t('固定全年税前总收入，比较0%、10%、20%、30%、40%的奖金占比。仅适用于雇主允许且符合计税条件的安排。'):t('保持其余输入不变，比较五组候选条件；缴费基数不会随工资自动变化。')}</p>
      </section>
      {busy&&<section className="panel"><Skeleton active /></section>}
      {changes&&!busy&&<>
        {JSON.stringify(input)!==JSON.stringify(scenario)&&<Alert type="warning" showIcon message={t('基础输入已改变，下方为上次比较结果。重新计算可更新。')} />}
        <section className="panel"><h2>{t('条件变化结果')}</h2><Chart label={t('条件变化与年度现金比较图')} option={{color:['#1f4d45'],tooltip:{trigger:'axis'},grid:{left:75,right:20,top:35,bottom:35},xAxis:{type:'category',data:changes.points.map(p=>valueLabel(p.value))},yAxis:{type:'value',name:t('年度还贷后现金')},series:[{type:'bar',barMaxWidth:52,data:changes.points.map(p=>Number(p.annualCashAfterMortgage))}]}} />
        <Table rowKey="value" dataSource={changes.points} pagination={false} scroll={{x:1000}} columns={[
          {title:labels[changes.parameter],dataIndex:'value',render:valueLabel},
          {title:t('全年税前收入'),dataIndex:'annualGrossIncome',render:money},
          {title:t('年度个人所得税'),dataIndex:'annualTax',render:money},
          {title:t('年度还贷后现金'),dataIndex:'annualCashAfterMortgage',render:money},
          {title:t('全期总利息'),dataIndex:'totalInterest',render:money},
          {title:t('约束检查'),render:(_,p)=><Tag title={p.violations.map(v=>t(v)).join('; ')} color={p.feasible?'success':'warning'}>{p.feasible?t('满足约束'):t('存在缺口')}</Tag>},
          {title:t('操作'),render:(_,p)=><Button size="small" disabled={items.length>=4} onClick={()=>void onAdd(p.scenario,`${labels[changes.parameter]} ${valueLabel(p.value)}`)}>{t('加入比较')}</Button>},
        ]}/><p className="field-note">{t(changes.assumption)}</p></section>
      </>}
    </>}
  </>;
}
