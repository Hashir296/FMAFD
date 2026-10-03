import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RefreshCw } from 'lucide-react';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const AIInsightsPage = () => {
  const { showToast } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const load = async () => {
    const res = await api.get('/ai/insights');
    setInsights(res.data || []);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const ask = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    try {
      const res = await api.post('/ai/assistant/chat', { query: question.trim() });
      setAnswer(res.data);
    } catch (err) {
      showToast(err.message || 'Could not ask the books', 'error');
    } finally {
      setAsking(false);
    }
  };

  const writeReview = async () => {
    setReviewing(true);
    try {
      const res = await api.get('/ai/review');
      setReview(res.data);
    } catch (err) {
      showToast(err.message || 'Could not write the review', 'error');
    } finally {
      setReviewing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post('/ai/generate-insights');
      setInsights(res.data || []);
      showToast('Notes rebuilt from the current books', 'success');
    } catch (err) {
      showToast(err.message || 'Could not refresh notes', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'forecast', label: 'Books' },
    { key: 'recommendation', label: 'Budgets' },
    { key: 'risk', label: 'Risk' },
    { key: 'anomaly', label: 'Vendors' },
  ];

  const visible = activeTab === 'all' ? insights : insights.filter((item) => item.type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-[#1C2B24]">Ledger notes</h1>
          <p className="text-sm text-[#6B6256] mt-1">The cards are calculated from the books. The written review and questions are answered by OpenRouter from those same figures.</p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="flex items-center gap-2 bg-[#1C2B24] text-[#F7F1E8] px-3 py-2 rounded-md text-sm">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Recalculating…' : 'Recalculate'}
        </button>
      </div>

      <section className="bg-white border border-[#DDD4C4] rounded-md p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Written review</h2>
          <button onClick={writeReview} disabled={reviewing} className="px-3 py-2 border border-[#DDD4C4] rounded-md text-sm">
            {reviewing ? 'Writing…' : 'Write from the books'}
          </button>
        </div>
        {review ? (
          <div>
            <p className="text-sm text-[#2C261C] whitespace-pre-wrap">{review.review}</p>
            <p className="text-xs text-[#8A6A3B] mt-2">{review.model}</p>
          </div>
        ) : (
          <p className="text-sm text-[#6B6256]">This calls OpenRouter once and uses the posted totals, budgets, invoices, and open alerts.</p>
        )}
      </section>

      <form onSubmit={ask} className="bg-white border border-[#DDD4C4] rounded-md p-5 space-y-3">
        <h2 className="font-serif text-2xl">Ask the books</h2>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="Which budget is over its amount, and what cash is in the bank?"
          className="w-full border border-[#DDD4C4] rounded-md p-3 text-sm"
        />
        <button type="submit" disabled={asking || !question.trim()} className="px-3 py-2 bg-[#1C2B24] text-[#F7F1E8] rounded-md text-sm">
          {asking ? 'Reading the books…' : 'Ask'}
        </button>
        {answer && <p className="text-sm text-[#2C261C] whitespace-pre-wrap">{answer.answer}</p>}
      </form>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm ${activeTab === tab.key ? 'bg-[#1C2B24] text-[#F7F1E8]' : 'bg-white border border-[#DDD4C4]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#6B6256]">Reading the books…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[#6B6256]">Nothing to report in this section.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {visible.map((insight) => (
            <article key={insight.id} className="bg-white border border-[#DDD4C4] rounded-md p-5">
              <p className="text-xs uppercase tracking-wide text-[#8A6A3B]">{insight.severity}</p>
              <h2 className="font-serif text-2xl mt-1">{insight.title}</h2>
              <p className="text-sm text-[#2C261C] mt-2">{insight.summary}</p>
              {insight.dollarImpact !== undefined && (
                <p className="text-sm mt-2">Amount in view: {money(insight.dollarImpact)}</p>
              )}
              {insight.evidence?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-[#6B6256]">
                  {insight.evidence.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm">{insight.recommendedAction}</p>
                {insight.actionRoute && (
                  <button onClick={() => navigate(insight.actionRoute)} className="shrink-0 text-sm text-[#8A6A3B]">Open</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
