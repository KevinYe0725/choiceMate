import { useState } from 'react';
import type { DimensionKey } from '../api/types';

export type WeightDimension = {
  key: DimensionKey;
  label: string;
  min: number;
  max: number;
  default: number;
};

type Props = {
  dimensions: WeightDimension[];
  initial?: Record<DimensionKey, number>;
  onSubmit: (weights: Record<DimensionKey, number>) => Promise<void>;
  loading?: boolean;
};

export default function WeightsSlidersForm({ dimensions, initial, onSubmit, loading }: Props) {
  const initialValues = dimensions.reduce((acc, dim) => {
    acc[dim.key] = initial?.[dim.key] ?? dim.default;
    return acc;
  }, {} as Record<DimensionKey, number>);

  const [weights, setWeights] = useState<Record<DimensionKey, number>>(initialValues);

  const updateWeight = (key: DimensionKey, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    await onSubmit(weights);
  };

  return (
    <div className="card">
      <div className="section-title">Round 1：权重设置</div>
      <div className="grid two">
        {dimensions.map((dim) => (
          <label key={dim.key} className="card" style={{ boxShadow: 'none', border: '1px solid #e3e6ef' }}>
            <div style={{ fontWeight: 600 }}>{dim.label}</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              {dim.min} - {dim.max}
            </div>
            <input
              type="range"
              min={dim.min}
              max={dim.max}
              step={1}
              value={weights[dim.key]}
              onChange={(e) => updateWeight(dim.key, Number(e.target.value))}
            />
            <input
              type="number"
              min={dim.min}
              max={dim.max}
              step={1}
              value={weights[dim.key]}
              onChange={(e) => updateWeight(dim.key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button className="btn" onClick={handleSubmit} disabled={loading}>
          {loading ? '提交中...' : '下一步'}
        </button>
      </div>
    </div>
  );
}
