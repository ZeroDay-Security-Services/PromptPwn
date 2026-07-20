// Single interface every route uses: llmChat(messages, systemPrompt) -> Promise<string>
// Swap providers with the LLM_PROVIDER env var — no route code changes.

async function callGroq(messages, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Groq API returned an unexpected response shape");
  return text.trim();
}

async function callOllama(messages, systemPrompt) {
  const host = process.env.OLLAMA_HOST || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.message?.content;
  if (typeof text !== "string") throw new Error("Ollama returned an unexpected response shape");
  return text.trim();
}

async function callOpenRouter(messages, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 800,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenRouter returned an unexpected response shape");
  return text.trim();
}

const PROVIDERS = { groq: callGroq, ollama: callOllama, openrouter: callOpenRouter };

/**
 * messages: [{ role: "user"|"assistant", content: string }, ...]
 * systemPrompt: string
 * returns: Promise<string> — the model's reply text
 * Throws on any failure — callers must handle errors and surface them,
 * never substitute a canned reply.
 */
async function llmChat(messages, systemPrompt) {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`Unknown LLM_PROVIDER "${provider}" — expected one of: ${Object.keys(PROVIDERS).join(", ")}`);
  return fn(messages, systemPrompt);
}

module.exports = { llmChat, callGroq, callOllama, callOpenRouter };
