import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

export default function ScenarioHero({ actions, price, loan, years }: {
  actions: ReactNode; price: string; loan: string; years: number;
}) {
  const { t } = useI18n();
  return <section className="calculator-heading" aria-labelledby="scenario-title">
    <div className="calculator-heading-row">
      <div>
        <div className="eyebrow">HOMEWISE · NINGBO</div>
        <h1 id="scenario-title">{t('住房贷款与个人所得税联合计算器')}</h1>
        <p>{t('根据收入、缴费及贷款条件，计算税后收入、月度现金流与融资成本。')}</p>
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
    <div className="scenario-facts">
      <div><span>{t('房屋总价')}</span><strong>¥ {price}</strong></div>
      <div><span>{t('预计贷款总额')}</span><strong>¥ {loan}</strong></div>
      <div><span>{t('贷款期限')}</span><strong>{years} {t('年')}</strong></div>
    </div>
  </section>;
}
