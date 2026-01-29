import { useEffect, useMemo, useState } from 'react';
import NewConversationModal from '../components/NewConversationModal';
import { questionnaireNext, ApiError } from '../api/client';
import { generateUuid } from '../utils/uuid';
import {
  loadConversations,
  saveConversations,
  type Conversation
} from '../storage/conversations';

const formatTime = (ts: number) =>
  new Date(ts).toLocaleString('zh-CN', { hour12: false });

type Props = {
  navigate: { toHome: () => void; toConversation: (id: string) => void };
};

export default function HomePage({ navigate }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  const handleCreate = async (data: { problem: string; options: string[] }) => {
    const conversationId = generateUuid();
    const now = Date.now();

    const baseConversation: Conversation = {
      conversationId,
      createdAt: now,
      updatedAt: now,
      problem: data.problem,
      options: data.options,
      state: null,
      round: 0,
      decision: null,
      factsCompletion: [],
      assumptions: [],
      messages: []
    };

    try {
      const response = await questionnaireNext({
        problem: data.problem,
        options: data.options,
        state: null,
        last_answer: null
      });

      const nextConversation: Conversation = {
        ...baseConversation,
        updatedAt: Date.now(),
        round: response.round,
        state: response.state,
        decision: response.decision,
        factsCompletion: response.facts_completion || [],
        assumptions: response.assumptions || [],
        messages: [
          {
            id: generateUuid(),
            role: 'system',
            content: { type: 'question', question: response.question },
            ts: Date.now()
          }
        ]
      };

      const nextList = [...conversations, nextConversation];
      setConversations(nextList);
      saveConversations(nextList);
      setShowModal(false);
      navigate.toConversation(conversationId);
    } catch (err) {
      if (!(err instanceof ApiError) || (err.status !== 400 && err.status !== 422)) {
        alert((err as Error).message || '请求失败');
      }
      throw err;
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>ChoiceMate（AI 选择器）</h2>
          <div className="muted">本地会话列表（localStorage）</div>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>
          新建选择会话
        </button>
      </div>

      <div className="card">
        <div className="section-title">会话列表</div>
        {sorted.length === 0 && <div className="muted">暂无会话，请先创建。</div>}
        <div className="list">
          {sorted.map((conv) => (
            <div key={conv.conversationId} className="list-item">
              <div>
                <h4>{conv.problem}</h4>
                <div className="muted">选项：{conv.options.join(' / ')}</div>
                <div className="muted">更新时间：{formatTime(conv.updatedAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="tag">
                  {conv.decision ? '已出结果' : `未完成 · Round ${conv.round}`}
                </span>
                <button
                  className="btn secondary"
                  onClick={() => navigate.toConversation(conv.conversationId)}
                >
                  进入
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewConversationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
