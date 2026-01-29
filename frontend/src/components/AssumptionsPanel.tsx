import type { FactsCompletionItem } from '../api/types';

type Props = {
  assumptions: string[];
  factsCompletion: FactsCompletionItem[];
};

export default function AssumptionsPanel({ assumptions, factsCompletion }: Props) {
  if ((assumptions?.length ?? 0) === 0 && (factsCompletion?.length ?? 0) === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="section-title">假设与补全信息</div>
      {assumptions?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="section-title">Assumptions</div>
          <ul>
            {assumptions.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {factsCompletion?.length > 0 && (
        <div>
          <div className="section-title">Facts Completion</div>
          <table className="table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Dimension</th>
                <th>Filled Value</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {factsCompletion.map((item, idx) => (
                <tr
                  key={idx}
                  className={item.source === 'default' ? 'highlight-default' : undefined}
                >
                  <td>{item.option}</td>
                  <td>{item.dimension}</td>
                  <td>{item.filled_value}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted" style={{ marginTop: 8 }}>
            source=default 表示由后端按中性值补全
          </div>
        </div>
      )}
    </div>
  );
}
