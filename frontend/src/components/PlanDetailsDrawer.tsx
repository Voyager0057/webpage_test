import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Empty, Select, Table, Tabs, Tag } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Chart from './Chart';
import { useI18n } from '../i18n';
import { download, toCsvCell } from '../api';
import type { CalculationResult, MonthlyRow, ScheduleRow } from '../types';

export default function PlanDetailsDrawer({ open, calculation, name, dirty, onClose, onNavigate }: {
  open: boolean; calculation?: CalculationResult; name: string; dirty: boolean;
  onClose: () => void; onNavigate: (page: string) => void;
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState('income');
  const [year, setYear] = useState(0);
  useEffect(() => {
    if (open) { setTab('income'); setYear(0); }
  }, [open, calculation]);
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('plan-details-open');
    return () => { document.body.classList.remove('plan-details-open'); };
  }, [open]);
  const money = (v: unknown) => Number(v ?? 0).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const column = <T extends object>(title: string, dataIndex: keyof T) => ({ title, dataIndex: dataIndex as string, width: 140, render: (v: string) => money(v) });
  const month = { title: t('月份'), dataIndex: 'label', width: 110, fixed: 'left' as const };
  const income: ColumnsType<MonthlyRow> = [month,
    column(t('现金收入'), 'grossIncome'), column(t('个人社保'), 'employeeSocial'), column(t('个人公积金'), 'employeePf'),
    column(t('房贷利息扣除'), 'mortgageDeduction'), column(t('累计应纳税所得额'), 'cumulativeTaxableIncome'),
    column(t('预扣个税'), 'tax'), column(t('工资到账'), 'takeHome')];
  const cash: ColumnsType<MonthlyRow> = [month, column(t('期初公积金余额'), 'openingPfBalance'),
    column(t('个人公积金'), 'employeePf'), column(t('单位公积金'), 'employerPf'), column(t('公积金还贷提取'), 'pfOffset'),
    column(t('期末公积金余额'), 'pfBalance'), column(t('房贷应还'), 'mortgagePayment'),
    column(t('还贷后现金'), 'cashAfterMortgage'), column(t('生活支出'), 'livingCost'), column(t('可支配结余'), 'disposableCash')];
  const loans: ColumnsType<ScheduleRow> = [{ title: t('期数'), dataIndex: 'month', width: 80, fixed: 'left' },
    column(t('月供'), 'payment'), column(t('本金'), 'principal'), column(t('利息'), 'interest'),
    column(t('商贷本金'), 'commercialPrincipal'), column(t('商贷利息'), 'commercialInterest'),
    column(t('公积金贷款本金'), 'pfPrincipal'), column(t('公积金贷款利息'), 'pfInterest'),
    column(t('剩余本金'), 'remainingPrincipal')];
  function exportLedger() {
    if (!calculation) return;
    const isLoan = tab === 'schedule';
    const columns = isLoan ? loans : tab === 'income' ? income : cash;
    const rows = isLoan ? calculation.schedule : calculation.monthly;
    const values = rows.map((row) => columns.map((c) => (row as unknown as Record<string, unknown>)[String('dataIndex' in c ? c.dataIndex : '')]));
    const csv = '\uFEFF' + [columns.map((c) => c.title), ...values].map((r) => r.map(toCsvCell).join(',')).join('\r\n');
    download(csv, isLoan ? 'homewise-repayment.csv' : `homewise-${calculation.input.taxYear}-${tab}.csv`, 'text/csv;charset=utf-8');
  }
  const selectedYear = calculation && year <= calculation.input.loanYears ? year : 0;
  const rows = calculation?.schedule.filter((r) => selectedYear === 0 || Math.ceil(r.month / 12) === selectedYear) ?? [];
  const annualDebt = calculation?.schedule.filter((r) => r.month % 12 === 0) ?? [];
  return <Drawer title={t('方案详情')} open={open} onClose={onClose} placement="right"
    width="min(1180px, 100vw)" rootClassName="haven-theme plan-details-drawer" destroyOnHidden
    closable={false} extra={<Button onClick={onClose}>{t('关闭详情')}</Button>}>
    <p className="body-copy">{t('核对逐月收入、税款、贷款本金及公积金账户变化。')}</p>
    {!calculation ? <section className="panel"><Empty description={t('请先完成计算。')} /></section> : <>
      <section className="panel snapshot-summary">
        <div><Tag color="green">{t(name)}</Tag><Tag>{calculation.policyVersion}</Tag><Tag>{calculation.input.taxYear}</Tag></div>
        <p>{t('{0}年贷款，{1}，贷款总额 ¥{2}。', [calculation.input.loanYears, calculation.input.repaymentMethod === 'ANNUITY' ? t('等额本息') : t('等额本金'), money(calculation.summary.totalLoan)])}</p>
        {dirty && <Alert type="warning" showIcon message={t('当前输入已修改，此处保留所选方案的计算快照。')} />}
        {!calculation.feasible && <Alert type="warning" showIcon message={t('当前方案存在约束缺口')} description={calculation.violations.map((v) => t(v)).join('; ')} />}
        <div className="summary-facts"><div><span>{t('年度税后到账收入')}</span><strong>¥ {money(calculation.summary.annualTakeHome)}</strong></div><div><span>{t('年度还贷后现金')}</span><strong>¥ {money(calculation.summary.annualCashAfterMortgage)}</strong></div><div><span>{t('全期总利息')}</span><strong>¥ {money(calculation.summary.totalInterest)}</strong></div></div>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>{t('逐月明细')}</h2><div className="page-actions"><Button icon={<DownloadOutlined aria-hidden="true" />} onClick={exportLedger}>{t('导出明细 CSV')}</Button><Button icon={<PrinterOutlined aria-hidden="true" />} onClick={() => window.print()}>{t('打印／保存 PDF')}</Button></div></div>
        <Tabs activeKey={tab} onChange={setTab} items={[{key: 'income', label: t('收入与个税')}, {key: 'cash', label: t('现金流与公积金')}, {key: 'schedule', label: t('贷款还款计划')}]} />
        {tab === 'schedule' ? <>
          <div className="table-toolbar"><Select aria-label={t('还款年度筛选')} value={selectedYear} onChange={setYear} options={[{value: 0, label: t('全部年度')}, ...Array.from({length: calculation.input.loanYears}, (_, i) => ({value: i + 1, label: t('第 {0} 年', [i + 1])}))]} /><span>{t('导出包含完整贷款期限的全部期数。')}</span></div>
          <Table<ScheduleRow> rowKey="month" columns={loans} dataSource={rows} scroll={{x: 1250}} size="small" pagination={{pageSize: 12, showSizeChanger: false, showTotal: (n) => t('共 {0} 期', [n])}} />
        </> : <Table<MonthlyRow> rowKey="month" columns={tab === 'income' ? income : cash} dataSource={calculation.monthly} scroll={{x: tab === 'income' ? 1120 : 1510}} size="small" pagination={false} />}
        <p className="field-note">{tab === 'income' ? t('年度税额与预扣税款分别记录，尚未收到的汇算退税不计入当年现金。') : tab === 'cash' ? t('还贷提取以已经偿还的上月本息为限；当月缴存次月可用。单位公积金进入账户，不计入工资到账。') : t('本金与利息分别计算，最后一期处理分位尾差并结清本金。')}</p>
      </section>
      <div className="method-grid">
        <section className="panel"><h2>{t('年度现金流')}</h2><Chart height={260} label={t('月度收入与还贷后现金图')} option={{color:['#1f4d45','#c8a15a'], tooltip:{trigger:'axis'}, legend:{top:0,data:[t('工资到账'),t('还贷后现金')]}, grid:{left:65,right:20,bottom:30,top:45}, xAxis:{type:'category',data:calculation.monthly.map(r=>r.label.slice(5))}, yAxis:{type:'value'}, series:[{name:t('工资到账'),type:'line',data:calculation.monthly.map(r=>Number(r.takeHome))},{name:t('还贷后现金'),type:'line',data:calculation.monthly.map(r=>Number(r.cashAfterMortgage))}]}} /></section>
        <section className="panel"><h2>{t('贷款余额变化')}</h2><Chart height={260} label={t('贷款全期剩余本金曲线')} option={{color:['#1f4d45'], tooltip:{trigger:'axis'}, grid:{left:80,right:20,bottom:30,top:45}, xAxis:{type:'category',data:annualDebt.map(r=>String(r.month/12))}, yAxis:{type:'value'}, series:[{type:'line',data:annualDebt.map(r=>Number(r.remainingPrincipal)),areaStyle:{opacity:.08}}]}} /></section>
      </div>
      <section className="panel"><div className="panel-header"><h2>{t('计算依据与评价口径')}</h2><Button onClick={() => onNavigate('policy')}>{t('查看政策与方法')}</Button></div>
        <div className="summary-facts"><div><span>{t('年度个人所得税')}</span><strong>¥ {money(calculation.summary.annualTax)}</strong></div><div><span>{t('预计汇算退税差额')}</span><strong>¥ {money(calculation.summary.annualSettlementRefund)}</strong></div><div><span>{t('通胀调整付款成本')}</span><strong>¥ {money(calculation.summary.realPaymentCost)}</strong></div></div>
        <p className="field-note">{t('融资付款口径，不含期末房产价值，不等于长期净财富。')}</p>
        <ul className="plain-list">{calculation.assumptions.map((s) => <li key={s}>{t(s)}</li>)}</ul>
        <Alert type="info" showIcon message={t('输入与政策说明')} description={calculation.warnings.map((v) => t(v)).join(' ')} />
      </section>
    </>}
  </Drawer>;
}
