const chat = async (messages) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    const error = new Error('OPENROUTER_API_KEY is not set.');
    error.status = 503;
    throw error;
  }

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5175',
      'X-Title': 'FinGuard',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'OpenRouter request failed.');
    error.status = response.status;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenRouter returned an empty answer.');
  }

  return { text, model: data.model || model };
};

const SYSTEM = `You are the finance desk writer for this company.
Use only the figures, names, and dates in the JSON the user provides.
If a number or name is not in that JSON, say you do not have it on the books.
Do not invent vendors, amounts, dates, or account balances.
Do not give instructions for hiding a payment or bypassing a review.
Answer in the same language as the question, in plain sentences.
Money is US dollars.`;

module.exports = { chat, SYSTEM };
