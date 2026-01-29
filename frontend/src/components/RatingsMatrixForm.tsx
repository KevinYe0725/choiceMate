import { useMemo, useState } from 'react';
import type { DimensionKey } from '../api/types';

export type RatingsDimension = {
  key: DimensionKey;
  label: string;
};

type Props = {
  options: string[];
  dimensions: RatingsDimension[];
  defaults: Record<string, Record<DimensionKey, number>>;
  initial?: Record<string, Record<DimensionKey, number | null>>;
  onSubmit: (ratings: Record<string, Record<DimensionKey, number | null>>) => Promise<void>;
  loading?: boolean;
};

const buildInitial = (
  options: string[],
  dimensions: RatingsDimension[],
  defaults: Record<string, Record<DimensionKey, number>>,
  initial?: Record<string, Record<DimensionKey, number | null>>
) => {
  const result: Record<string, Record<DimensionKey, string>> = {};
  options.forEach((option) => {
    result[option] = {} as Record<DimensionKey, string>;
    dimensions.forEach((dim) => {
      const raw = initial?.[option]?.[dim.key];
      if (raw === null || raw === undefined) {
        result[option][dim.key] = '';
      } else {
        result[option][dim.key] = String(raw);
      }
    });
    if (!initial) {
      dimensions.forEach((dim) => {
        result[option][dim.key] = String(defaults?.[option]?.[dim.key] ?? '');
      });
    }
  });
  return result;
};

export default function RatingsMatrixForm({
  options,
  dimensions,
  defaults,
  initial,
  onSubmit,
  loading
}: Props) {
  const [error, setError] = useState('');
  const initialState = useMemo(
    () => buildInitial(options, dimensions, defaults, initial),
    [options, dimensions, defaults, initial]
  );
  const [values, setValues] = useState(initialState);

  const updateValue = (option: string, key: DimensionKey, value: string) => {
    setValues((prev) => ({
      ...prev,
      [option]: {
        ...prev[option],
        [key]: value
      }
    }));
  };

  const handleSubmit = async () => {
    const next: Record<string, Record<DimensionKey, number | null>> = {};
    for (const option of options) {
      next[option] = {} as Record<DimensionKey, number | null>;
      for (const dim of dimensions) {
        const raw = values[option]?.[dim.key] ?? '';
        if (raw === '') {
          next[option][dim.key] = null;
          continue;
        }
        const num = Number(raw);
        if (Number.isNaN(num)) {
          setError('请输入 1-5 的数字，未知可留空');
          return;
        }
        if (num < 1 || num > 5) {
          setError('评分需在 1 到 5 之间');
          return;
        }
        next[option][dim.key] = num;
      }
    }
    setError('');
    await onSubmit(next);
  };

  return (
    <div className="card">
      <div className="section-title">Round 2：评分矩阵（可留空）</div>
      <div className="muted" style={{ marginBottom: 8 }}>
        cost / risk 数值越高表示越糟；impact / reversibility 数值越高表示越好。
      </div>
      {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>选项</th>
            {dimensions.map((dim) => (
              <th key={dim.key}>{dim.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {options.map((option) => (
            <tr key={option}>
              <td>{option}</td>
              {dimensions.map((dim) => (
                <td key={dim.key}>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    value={values[option]?.[dim.key] ?? ''}
                    placeholder="留空"
                    onChange={(e) => updateValue(option, dim.key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button className="btn" onClick={handleSubmit} disabled={loading}>
          {loading ? '提交中...' : '下一步'}
        </button>
      </div>
    </div>
  );
}
