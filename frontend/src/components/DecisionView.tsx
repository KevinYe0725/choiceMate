import { Fragment } from 'react';

type Props = {
  decision: any;
};

type DimKey = 'impact' | 'cost' | 'risk' | 'reversibility';
const DIMS: DimKey[] = ['impact', 'cost', 'risk', 'reversibility'];

function formatNum(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '-';
  return String(v);
}

export default function DecisionView({ decision }: Props) {
  if (!decision) return null;

  const bestOption: string | undefined = decision.best_option;
  const sb = decision.score_breakdown;

  // Backend contract: per_option is an array of rows.
  const perOption: any[] = Array.isArray(sb?.per_option) ? sb.per_option : [];
  const weightsObj: Record<string, unknown> | undefined = sb?.weights;

  return (
    <div className="card">
      <div className="section-title">Round 3：决策结果</div>

      {bestOption && (
        <div className="notice" style={{ marginBottom: 12 }}>
          推荐选项：<strong>{bestOption}</strong>
        </div>
      )}

      {/* Weights */}
      {weightsObj && (
        <Fragment>
          <div className="section-title">权重（weights）</div>
          <table className="table" style={{ marginBottom: 12 }}>
            <thead>
              <tr>
                {DIMS.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {DIMS.map((d) => (
                  <td key={d}>{formatNum((weightsObj as any)?.[d])}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </Fragment>
      )}

      {/* Per-option breakdown */}
      {perOption.length > 0 ? (
        <Fragment>
          <div className="section-title">Score Breakdown（per_option）</div>
          <table className="table" style={{ marginBottom: 12 }}>
            <thead>
              <tr>
                <th>选项</th>
                <th>score</th>
                {DIMS.map((d) => (
                  <th key={`r-${d}`}>{d} rating</th>
                ))}
                {DIMS.map((d) => (
                  <th key={`c-${d}`}>{d} contrib</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perOption.map((row) => {
                const option = row?.option;
                const ratings = row?.ratings || {};
                const contributions = row?.contributions || {};
                return (
                  <tr key={String(option)}>
                    <td>
                      {String(option)}
                      {bestOption && option === bestOption ? ' ✅' : ''}
                    </td>
                    <td>{formatNum(row?.score)}</td>
                    {DIMS.map((d) => (
                      <td key={`rr-${String(option)}-${d}`}>{formatNum(ratings?.[d])}</td>
                    ))}
                    {DIMS.map((d) => (
                      <td key={`cc-${String(option)}-${d}`}>{formatNum(contributions?.[d])}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Fragment>
      ) : (
        <div className="muted">未提供 score_breakdown.per_option</div>
      )}

      <details>
        <summary>原始 decision JSON</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(decision, null, 2)}</pre>
      </details>
    </div>
  );
}
