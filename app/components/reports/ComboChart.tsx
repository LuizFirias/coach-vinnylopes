import React from 'react';
import { Svg, Line, Path, Rect, Text, View } from '@react-pdf/renderer';

interface ComboChartProps {
  data: Array<{ data: string; volumeTotal: number; cargaMaxima: number }>;
  width: number;
  height: number;
}

export function ComboChart({ data, width, height }: ComboChartProps) {
  const padding = { top: 20, right: 45, bottom: 20, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (!data || data.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center', border: '1px dashed #E0E0E0', borderRadius: 6 }}>
        <Text style={{ fontSize: 9, color: '#6B6B6B', fontFamily: 'Helvetica' }}>Dados insuficientes para exibir o gráfico</Text>
      </View>
    );
  }

  const volumes = data.map(d => d.volumeTotal);
  const cargas = data.map(d => d.cargaMaxima);

  const maxVolume = Math.max(...volumes, 100);
  const maxCarga = Math.max(...cargas, 10);

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
  const barWidth = data.length > 1 ? Math.min(24, (chartWidth / data.length) * 0.4) : 24;

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
    const y = padding.top + chartHeight * frac;
    const volVal = Math.round(maxVolume * (1 - frac));
    const cargaVal = Math.round(maxCarga * (1 - frac));

    return (
      <React.Fragment key={idx}>
        <Line
          x1={padding.left}
          y1={y}
          x2={padding.left + chartWidth}
          y2={y}
          stroke="#E0E0E0"
          strokeWidth={0.5}
        />
        {/* Eixo esquerdo (Volume) */}
        <Text
          x={padding.left - 5}
          y={y + 2.5}
          style={{ fontSize: 6, fontFamily: 'Helvetica' }}
          fill="#6B6B6B"
          textAnchor="end"
        >
          {volVal} kg
        </Text>
        {/* Eixo direito (Carga) */}
        <Text
          x={padding.left + chartWidth + 5}
          y={y + 2.5}
          style={{ fontSize: 6, fontFamily: 'Helvetica' }}
          fill="#6B6B6B"
          textAnchor="start"
        >
          {cargaVal} kg
        </Text>
      </React.Fragment>
    );
  });

  // Barras de Volume
  const bars = data.map((d, i) => {
    const barHeight = (d.volumeTotal / maxVolume) * chartHeight;
    const center = data.length > 1 
      ? padding.left + i * xStep 
      : padding.left + chartWidth / 2;
    const x = center - barWidth / 2;
    const y = padding.top + chartHeight - barHeight;

    return (
      <Rect
        key={`bar-${i}`}
        x={x}
        y={y}
        width={barWidth}
        height={barHeight}
        fill="#D4A843"
        opacity={0.65}
        rx={1}
      />
    );
  });

  // Linha e pontos de Carga Máxima
  let linePoints: string[] = [];
  const points = data.map((d, i) => {
    const center = data.length > 1 
      ? padding.left + i * xStep 
      : padding.left + chartWidth / 2;
    const y = padding.top + chartHeight - (d.cargaMaxima / maxCarga) * chartHeight;
    linePoints.push(`${center},${y}`);

    return (
      <Rect
        key={`point-${i}`}
        x={center - 2}
        y={y - 2}
        width={4}
        height={4}
        fill="#1A1A1A"
        rx={1}
      />
    );
  });

  const linePath = data.length > 1 ? `M ${linePoints.join(' L ')}` : '';

  // Eixo X Labels (Datas)
  const dateLabels = data.map((d, i) => {
    const center = data.length > 1 
      ? padding.left + i * xStep 
      : padding.left + chartWidth / 2;
    const y = padding.top + chartHeight + 10;

    return (
      <Text
        key={`date-${i}`}
        x={center}
        y={y}
        style={{ fontSize: 6.5, fontFamily: 'Helvetica' }}
        fill="#6B6B6B"
        textAnchor="middle"
      >
        {d.data}
      </Text>
    );
  });

  return (
    <View style={{ marginVertical: 6, alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {gridLines}
        {bars}
        {linePath ? <Path d={linePath} stroke="#1A1A1A" strokeWidth={1.5} fill="none" /> : null}
        {points}
        {dateLabels}
      </Svg>
      {/* Legenda */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: '#D4A843', opacity: 0.65, borderRadius: 1 }} />
          <Text style={{ fontSize: 7, color: '#6B6B6B', fontFamily: 'Helvetica' }}>Volume Total (kg)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 2, backgroundColor: '#1A1A1A', borderRadius: 1 }} />
          <Text style={{ fontSize: 7, color: '#6B6B6B', fontFamily: 'Helvetica' }}>Carga Máxima (PR, kg)</Text>
        </View>
      </View>
    </View>
  );
}
