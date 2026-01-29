/*
Backend Contract (snake_case) - keep in-code for context isolation:

Base URL: VITE_API_BASE_URL (e.g., http://127.0.0.1:8000)

POST /questionnaire/next
- New session: state omitted or null; last_answer = null
- Round1 last_answer:
  {"weights":{"impact":4,"cost":2,"risk":3,"reversibility":1}}
- Round2 last_answer (nullable values allowed):
  {"option_ratings":{"A":{"impact":4,"cost":null,"risk":3,"reversibility":2},"B":{"impact":2,"cost":1,"risk":null,"reversibility":5}}}
- Response:
  {
    "round": 2,
    "question": <object or null>,
    "state": <object>,
    "decision": <object or null>,
    "facts_completion": [{"option":"A","dimension":"cost","filled_value":3,"source":"default"}],
    "assumptions": ["你未填写「A」的 cost，我暂以中性值 3 作为假设。"]
  }

Round1 question (weights_sliders):
{
  "type":"weights_sliders",
  "prompt":"请调整你对各维度的重视程度（1-5）",
  "dimensions":[
    {"key":"impact","label":"长期收益/成长","min":1,"max":5,"default":3},
    {"key":"cost","label":"成本（时间/金钱/精力）","min":1,"max":5,"default":2},
    {"key":"risk","label":"风险（失败/后悔）","min":1,"max":5,"default":2},
    {"key":"reversibility","label":"可逆性（能否回头）","min":1,"max":5,"default":1}
  ]
}

Round2 question (ratings_matrix):
{
  "type":"ratings_matrix",
  "prompt":"请为每个选项在各维度打分（1-5），未知可留空",
  "options":["A","B"],
  "dimensions":[
    {"key":"impact","label":"长期收益/成长（越高越好）"},
    {"key":"cost","label":"成本（越高=越贵/越累）"},
    {"key":"risk","label":"风险（越高=越危险）"},
    {"key":"reversibility","label":"可逆性（越高=越能回头）"}
  ],
  "defaults":{
    "A":{"impact":3,"cost":3,"risk":3,"reversibility":3},
    "B":{"impact":3,"cost":3,"risk":3,"reversibility":3}
  }
}

POST /explain
Request:
{
  "problem":"string",
  "options":["A","B"],
  "facts": { "weights": {...}, "option_ratings": {...} },
  "decision": {...},
  "facts_completion":[{"option":"A","dimension":"cost","filled_value":3,"source":"default"}],
  "assumptions":["..."],
  "messages":[{"role":"user","content":"..."},{"role":"system","content":"..."}],
  "style":{"tone":"clear","length":"medium"}
}
Response:
{"explanation":"string","highlights":["string"],"followups":["string"]}

Semantics:
- canonical dimensions: impact / cost / risk / reversibility
- cost & risk higher = worse; impact & reversibility higher = better
- Round2 blanks => backend fills 3 and exposes facts_completion / assumptions
*/

export type DimensionKey = 'impact' | 'cost' | 'risk' | 'reversibility';

export type WeightsQuestion = {
  type: 'weights_sliders';
  prompt: string;
  dimensions: Array<{
    key: DimensionKey;
    label: string;
    min: number;
    max: number;
    default: number;
  }>;
};

export type RatingsQuestion = {
  type: 'ratings_matrix';
  prompt: string;
  options: string[];
  dimensions: Array<{
    key: DimensionKey;
    label: string;
  }>;
  defaults: Record<string, Record<DimensionKey, number>>;
};

export type BackendQuestion = WeightsQuestion | RatingsQuestion;

export type FactsCompletionItem = {
  option: string;
  dimension: DimensionKey;
  filled_value: number;
  source: string;
};

export type QuestionnaireResponse = {
  round: number;
  question: BackendQuestion | null;
  state: any; // keep snake_case as returned by backend
  decision: any | null;
  facts_completion: FactsCompletionItem[];
  assumptions: string[];
};

export type ExplainRequest = {
  problem: string;
  options: string[];
  facts: any;
  decision: any;
  facts_completion: FactsCompletionItem[];
  assumptions: string[];
  messages: Array<{ role: 'user' | 'system'; content: string }>;
  style: { tone: 'clear'; length: 'medium' };
};

export type ExplainResponse = {
  explanation: string;
  highlights: string[];
  followups: string[];
};

export type QuestionnaireRequest = {
  problem: string;
  options: string[];
  state?: any | null;
  last_answer?: any | null;
};
