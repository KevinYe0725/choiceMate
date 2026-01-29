import { useEffect, useMemo, useState } from 'react';
import type { BackendQuestion, DimensionKey, ExplainResponse } from '../api/types';
import { explainDecision, questionnaireNext, ApiError } from '../api/client';
import {
  getConversationById,
  upsertConversation,
  type Conversation,
  type Message
} from '../storage/conversations';
import { generateUuid } from '../utils/uuid';
import WeightsSlidersForm from '../components/WeightsSlidersForm';
import RatingsMatrixForm from '../components/RatingsMatrixForm';
import DecisionView from '../components/DecisionView';
import ExplainView from '../components/ExplainView';
import AssumptionsPanel from '../components/AssumptionsPanel';

const normalizeMessageContent = (content: any): string => {
  if (typeof content === 'string') return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
};

const extractCurrentQuestion = (messages: Message[]): BackendQuestion | null => {
  const found = [...messages]
    .reverse()
    .find((msg) => msg.role === 'system' && msg.content?.type === 'question');
  return found?.content?.question ?? null;
};

const buildDecisionMessage = (decision: any): Message => ({
  id: generateUuid(),
  role: 'system',
  content: {
    type: 'decision',
    summary: `best_option=${decision?.best_option ?? '-'}`,
    decision
  },
  ts: Date.now()
});

type Props = {
  conversationId: string;
  navigate: { toHome: () => void; toConversation: (id: string) => void };
};

export default function ConversationPage({ conversationId, navigate }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    setConversation(getConversationById(conversationId));
  }, [conversationId]);

  const currentQuestion = useMemo(
    () => (conversation ? extractCurrentQuestion(conversation.messages) : null),
    [conversation]
  );

  const persistConversation = (next: Conversation) => {
    setConversation(next);
    upsertConversation(next);
  };

  const handleRound1Submit = async (weights: Record<DimensionKey, number>) => {
    if (!conversation) return;
    setLoading(true);
    setError('');
    const userMessage: Message = {
      id: generateUuid(),
      role: 'user',
      content: { type: 'weights', weights },
      ts: Date.now()
    };
    try {
      const response = await questionnaireNext({
        problem: conversation.problem,
        options: conversation.options,
        state: conversation.state,
        last_answer: { weights }
      });

      const messages = [...conversation.messages, userMessage];
      if (response.question) {
        messages.push({
          id: generateUuid(),
          role: 'system',
          content: { type: 'question', question: response.question },
          ts: Date.now()
        });
      }

      const nextConversation: Conversation = {
        ...conversation,
        updatedAt: Date.now(),
        round: response.round,
        state: response.state,
        decision: response.decision,
        factsCompletion: response.facts_completion || [],
        assumptions: response.assumptions || [],
        messages
      };
      persistConversation(nextConversation);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        setError(err.message);
      } else {
        alert((err as Error).message || '请求失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRound2Submit = async (
    ratings: Record<string, Record<DimensionKey, number | null>>
  ) => {
    if (!conversation) return;
    setLoading(true);
    setError('');
    const userMessage: Message = {
      id: generateUuid(),
      role: 'user',
      content: { type: 'option_ratings', option_ratings: ratings },
      ts: Date.now()
    };
    try {
      const response = await questionnaireNext({
        problem: conversation.problem,
        options: conversation.options,
        state: conversation.state,
        last_answer: { option_ratings: ratings }
      });

      const messages = [...conversation.messages, userMessage];
      if (response.question) {
        messages.push({
          id: generateUuid(),
          role: 'system',
          content: { type: 'question', question: response.question },
          ts: Date.now()
        });
      }
      if (response.decision) {
        messages.push(buildDecisionMessage(response.decision));
      }

      const nextConversation: Conversation = {
        ...conversation,
        updatedAt: Date.now(),
        round: response.round,
        state: response.state,
        decision: response.decision,
        factsCompletion: response.facts_completion || [],
        assumptions: response.assumptions || [],
        messages
      };
      persistConversation(nextConversation);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        setError(err.message);
      } else {
        alert((err as Error).message || '请求失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!conversation || !conversation.decision) return;
    setExplainLoading(true);
    setError('');
    try {
      const hasDecisionMessage = conversation.messages.some(
        (msg) => msg.content?.type === 'decision'
      );
      const messages = [...conversation.messages];
      if (!hasDecisionMessage) {
        messages.push(buildDecisionMessage(conversation.decision));
      }
      const explainMessages = messages.map((msg) => ({
        role: msg.role,
        content: normalizeMessageContent(msg.content)
      }));

      const response = await explainDecision({
        problem: conversation.problem,
        options: conversation.options,
        facts: conversation.state?.facts ?? {},
        decision: conversation.decision,
        facts_completion: conversation.factsCompletion,
        assumptions: conversation.assumptions,
        messages: explainMessages,
        style: { tone: 'clear', length: 'medium' }
      });

      setExplainData(response);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        setError(err.message);
      } else {
        alert((err as Error).message || '请求失败');
      }
    } finally {
      setExplainLoading(false);
    }
  };

  if (!conversation) {
    return (
      <div className="card">
        <div className="section-title">会话不存在</div>
        <button className="btn" onClick={navigate.toHome}>
          返回首页
        </button>
      </div>
    );
  }

  const weightsInitial = conversation.state?.facts?.weights as Record<DimensionKey, number> | undefined;
  const ratingsInitial = conversation.state?.facts?.option_ratings as
    | Record<string, Record<DimensionKey, number | null>>
    | undefined;

  return (
    <div>
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>ChoiceMate 会话</h2>
          <div className="muted">Round {conversation.round}</div>
        </div>
        <button className="btn ghost" onClick={navigate.toHome}>
          返回首页
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card">
        <div className="section-title">问题与选项</div>
        <div style={{ marginBottom: 8 }}>{conversation.problem}</div>
        <div className="muted">选项：{conversation.options.join(' / ')}</div>
      </div>

      <AssumptionsPanel
        assumptions={conversation.assumptions}
        factsCompletion={conversation.factsCompletion}
      />

      {conversation.round === 1 && currentQuestion?.type === 'weights_sliders' && (
        <WeightsSlidersForm
          dimensions={currentQuestion.dimensions}
          initial={weightsInitial}
          onSubmit={handleRound1Submit}
          loading={loading}
        />
      )}

      {conversation.round === 2 && currentQuestion?.type === 'ratings_matrix' && (
        <RatingsMatrixForm
          options={currentQuestion.options}
          dimensions={currentQuestion.dimensions}
          defaults={currentQuestion.defaults}
          initial={ratingsInitial}
          onSubmit={handleRound2Submit}
          loading={loading}
        />
      )}

      {conversation.round >= 3 && conversation.decision && (
        <DecisionView decision={conversation.decision} />
      )}

      {conversation.round >= 3 && conversation.decision && (
        <div className="card">
          <div className="section-title">解释生成</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            将使用当前会话消息、facts、decision、assumptions 生成自然语言解释。
          </div>
          <button className="btn" onClick={handleExplain} disabled={explainLoading}>
            {explainLoading ? '生成中...' : '生成自然语言解释'}
          </button>
        </div>
      )}

      <ExplainView data={explainData} />
    </div>
  );
}
