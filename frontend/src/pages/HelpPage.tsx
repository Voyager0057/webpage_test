import { Alert, Button, Collapse, Table, Tag } from 'antd';
import PageHeading from '../components/PageHeading';
import { useI18n } from '../i18n';
import type { Example, Scenario } from '../types';

export default function HelpPage({ examples, onLoad, onNavigate, onClear, hasCalculation, onInspectCurrent }: {
  hasCalculation: boolean; onInspectCurrent: () => void;
  examples: Example[]; onLoad: (scenario: Scenario) => void; onNavigate: (page: string) => void; onClear: () => void;
}) {
  const {t} = useI18n();
  const steps = [
    [t('输入财务条件'),t('在联合计算器中填写工资、绩效、奖金、缴费和购房条件；首次使用可加载虚构示例。'),'overview'],
    [t('核对计算结果'),t('检查约束状态，并在方案详情窗口核对税款、本金、利息及公积金账户变化。'),'details'],
    [t('设置优化约束'),t('固定房价和首付，设置贷款期限、额度、月供上限及最低结余，搜索可行方案。'),'optimize'],
    [t('比较与保存结果'),t('将原方案和推荐方案加入比较，查看差额，导出输入快照或明细。'),'sensitivity'],
  ];
  const roles = [
    ['Xingjian XIE',t('项目经理、业务分析师、辅助后端工程师'),t('审阅进度、核对需求与政策；负责政策和示例接口，协助后端集成。')],
    ['Xinyi DENG',t('前端工程师、UI设计师、业务分析师'),t('政策与计算方法、使用帮助与项目说明；与成员1共同核对业务内容。')],
    ['Haochen YIN',t('后端工程师'),t('联合计算器与方案详情窗口；个税、公积金、贷款计算及核心测试。')],
    ['Wan-Chia WEI',t('前端工程师、UI设计师'),t('联合计算器与方案详情窗口；公共导航、表单及页面布局。')],
    ['Boqing HAN',t('后端工程师'),t('方案优化器、条件比较接口；数据库、部署和自动构建。')],
    ['Zicheng LIU',t('前端工程师、UI设计师'),t('方案优化器、条件与方案比较；推荐结果、比较表及图表。')],
  ];
  const faq = [
    [t('为什么每个月的个税可能不同？'),t('工资薪金采用累计预扣，累计应纳税所得额可能进入不同税率档。奖金发放月份和计税方式也会影响月度预扣。')],
    [t('为什么贷款期限延长后总利息可能增加？'),t('较长期限通常降低每期偿还本金，但本金占用时间增加。应同时查看月供、年度现金和全期利息。')],
    [t('公积金提取为什么从第二个月开始？'),t('本模型在1月开始还款，按前一个月已还本息计算后续提取，首月没有已还记录。实际手续和到账时间以经办规则为准。')],
    [t('推荐方案代表什么？'),t('推荐排序只针对所选目标、候选范围及已建模约束。最高年度现金、最低利息与最低付款现值可能对应不同方案。')],
    [t('税后收入与还贷后现金有什么区别？'),t('税后到账收入已扣个人缴费和预扣税；还贷后现金再扣房贷并计入符合条件的还贷提取。可支配结余还要扣除生活支出。')],
    [t('收入与计算结果保存在哪里？'),t('当前输入和结果保存在本浏览器标签页的会话存储中，刷新后可恢复；个人薪酬不写入服务器数据库。可以主动导出文件或清除本次工作区。')],
    [t('可以用于其他城市或复杂家庭贷款吗？'),t('当前版本支持宁波普通首套、单一借款人的假设情景。共同借款、特殊额度上浮、提前还款和利率重定价未纳入此版本。')],
  ];
  return <>
    <PageHeading title={t('使用帮助与项目说明')} description={t('操作流程、术语说明、演示案例和项目交付信息。')} actions={<Button onClick={()=>onNavigate('overview')}>{t('进入联合计算器')}</Button>} />
    <section className="panel"><h2>{t('操作指南')}</h2><div className="guide-grid">{steps.map(([title,body,page],i)=><article key={page}><span className="step-number">0{i+1}</span><h3>{title}</h3><p>{body}</p><Button size="small" disabled={page === 'details' && !hasCalculation} onClick={()=>page === 'details' ? onInspectCurrent() : onNavigate(page)}>{page === 'details' ? t('查看方案明细') : t('打开页面')}</Button></article>)}</div></section>
    <section className="panel"><div className="panel-header"><h2>{t('演示案例')}</h2><Tag>{t('虚构数据')}</Tag></div><div className="example-grid">{examples.map(example=><article className="comparison-card" key={example.id}><h3>{t(example.name)}</h3><p>{t(example.description)}</p><Button onClick={()=>onLoad(example.scenario)}>{t('加载此示例')}</Button></article>)}</div></section>
    <section className="panel"><h2>{t('常见问题')}</h2><Collapse ghost items={faq.map(([label,answer],i)=>({key:String(i),label,children:<p className="body-copy">{answer}</p>}))} /></section>
    <section className="panel"><h2>{t('项目说明')}</h2><p className="body-copy">{t('GRP P01：住房贷款与个人所得税联合计算器。系统将收入、税款、公积金与住房贷款放在同一计算流程中，并在用户约束内比较融资方案。')}</p>
      <div className="summary-facts"><div><span>{t('前端')}</span><strong>React · TypeScript · Ant Design</strong><small>ECharts · Vite</small></div><div><span>{t('后端与数据')}</span><strong>Java · Spring Boot · BigDecimal</strong><small>PostgreSQL · H2</small></div><div><span>{t('测试与交付')}</span><strong>JUnit · Playwright</strong><small>Docker · GitHub Actions</small></div></div>
      <h3>{t('六人职责安排')}</h3><Table rowKey={r=>r.name} pagination={false} scroll={{x:760}} dataSource={roles.map(([name,role,work])=>({name,role,work}))} columns={[{title:t('成员'),dataIndex:'name',width:170},{title:t('角色'),dataIndex:'role',width:270},{title:t('工作范围'),dataIndex:'work'}]} />
      <p className="field-note">{t('此表为职责安排；实际贡献以代码审阅、测试记录和项目文档为准。')}</p>
    </section>
    <section className="panel"><h2>{t('阶段目标')}</h2><div className="milestone-grid">
      <article><Tag>2026.10.27 — 12.09</Tag><h3>{t('基础功能与中期交付')}</h3><p>{t('完成五个页面与方案详情窗口、核心计算、约束优化、比较及测试；12月9日提交中期报告。')}</p></article>
      <article><Tag>2026.12.10 — 2027.02.14</Tag><h3>{t('假期暂停')}</h3><p>{t('不安排开发、会议或报告任务；春节后恢复。')}</p></article>
      <article><Tag>2027.02.15 — 04</Tag><h3>{t('拓展与最终交付')}</h3><p>{t('完善解释与导出，完成设备验证、回归测试、最终报告和演示。课程截止日期及节假日以正式通知为准。')}</p></article>
    </div></section>
    <section className="panel"><h2>{t('数据与工作区')}</h2><Alert type="info" showIcon message={t('会话保存')} description={t('刷新页面可继续当前工作；关闭标签页可能清除会话。需要长期保留时，请导出方案JSON。')} /><Button danger onClick={onClear}>{t('清除本次工作区')}</Button></section>
  </>;
}
