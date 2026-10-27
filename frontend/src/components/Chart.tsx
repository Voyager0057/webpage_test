import { useEffect, useRef } from 'react';
import { init, use } from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { ECharts } from 'echarts/core';
import type { EChartsOption } from 'echarts';

use([BarChart, LineChart, ScatterChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

export default function Chart({ option, height = 290, label }: { option: EChartsOption; height?: number; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  useEffect(() => {
    if (!container.current) return;
    chart.current = init(container.current, undefined, { renderer: 'svg' });
    const observer = new ResizeObserver(() => chart.current?.resize());
    observer.observe(container.current);
    return () => { observer.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []);
  useEffect(() => { chart.current?.setOption({ ...option, animation: false }, { notMerge: true }); }, [option]);
  return <div ref={container} style={{ height, width: '100%' }} role="img" aria-label={label} />;
}
