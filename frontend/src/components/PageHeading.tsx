import type { ReactNode } from 'react';
export default function PageHeading({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">HOMEWISE · NINGBO</div><h1>{title}</h1><p>{description}</p></div><div className="page-actions">{actions}</div></div>;
}
