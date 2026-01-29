import type { ExplainResponse } from '../api/types';

type Props = {
  data: ExplainResponse | null;
};

export default function ExplainView({ data }: Props) {
  if (!data) return null;
  return (
    <div className="card">
      <div className="section-title">自然语言解释</div>
      <p>{data.explanation}</p>
      {data.highlights?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="section-title">Highlights</div>
          <ul>
            {data.highlights.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {data.followups?.length > 0 && (
        <div>
          <div className="section-title">Follow-ups</div>
          <ul>
            {data.followups.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
