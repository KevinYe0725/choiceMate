import { useEffect, useState } from 'react';
import { sanitizeOptions, sanitizeProblem } from '../utils/sanitize';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { problem: string; options: string[] }) => Promise<void>;
};

export default function NewConversationModal({ isOpen, onClose, onCreate }: Props) {
  const [problem, setProblem] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addOption = () => setOptions((prev) => [...prev, '']);

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    const cleanProblem = sanitizeProblem(problem);
    const cleanOptions = sanitizeOptions(options);
    if (!cleanProblem) {
      setError('请输入问题描述');
      return;
    }
    if (cleanOptions.length < 2) {
      setError('请至少输入两个选项');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onCreate({ problem: cleanProblem, options: cleanOptions });
      setProblem('');
      setOptions(['', '']);
    } catch (err) {
      setError((err as Error).message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <header>
          <h3 style={{ margin: 0 }}>新建选择会话</h3>
          <button className="btn ghost" onClick={onClose} disabled={loading}>
            关闭
          </button>
        </header>

        {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="grid" style={{ marginBottom: 12 }}>
          <label>
            <div className="section-title">问题描述</div>
            <textarea
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="例如：是否换工作？"
            />
          </label>
        </div>

        <div className="section-title">选项</div>
        <div className="grid" style={{ marginBottom: 16 }}>
          {options.map((option, index) => (
            <div key={index} className="inline-input">
              <input
                type="text"
                value={option}
                placeholder={`选项 ${index + 1}`}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              {options.length > 2 && (
                <button
                  className="btn ghost"
                  onClick={() => removeOption(index)}
                  disabled={loading}
                >
                  删除
                </button>
              )}
            </div>
          ))}
          <button className="btn secondary" onClick={addOption} disabled={loading}>
            添加选项
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button className="btn" onClick={handleConfirm} disabled={loading}>
            {loading ? '创建中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}
