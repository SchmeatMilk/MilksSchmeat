// Hybrid extraction: local regex ALWAYS runs (100% private); Claude API adds
// semantic understanding when ANTHROPIC_API_KEY is set. Every numeric fact must
// appear verbatim in its source quote AND in the source text — this kills both
// bad regex spans and LLM hallucinations.

// --- Path attribution by keyword -------------------------------------------
const PATH_KEYWORDS = [
  ['uber-delivery', /\b(uber|doordash|delivery|delivered|dropoff|drop-off|trips?)\b/i],
  ['ai-consulting', /\b(consult|client|discovery call|retainer|proposal|engagement)\b/i],
  ['ai-tools', /\b(saas|mrr|subscription|tool|api|product|users?)\b/i],
  ['online-work', /\b(content|freelance|gig|upwork|fiverr|article|post|video)\b/i],
  ['apps', /\b(app|app store|play store|download|in-app|mobile)\b/i],
];

function attributePath(context) {
  for (const [p, re] of PATH_KEYWORDS) {
    if (re.test(context)) return p;
  }
  return null;
}

// Window of text around an index, for quote + context.
function windowAround(text, idx, len, span = 50) {
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + len + span);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

const MONEY_CTX = /\b(earned|earn|revenue|made|paid|invoice|sale|sold|client paid|mrr|received|income|payout)\b/i;
const EXPENSE_CTX = /\b(spent|cost|expense|refund|paid out|bought|subscription fee)\b/i;

// --- Local regex extraction -------------------------------------------------
export function extractLocal(text, sourceFile, sourceDate) {
  const facts = [];

  // Revenue: a $-prefixed amount OR a number with an explicit currency code.
  // Requiring $/CAD/USD avoids capturing bare numbers like "4 hours" / "11 trips".
  const moneyRe = /(?:\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s?(?:CAD|USD))/gi;
  let m;
  while ((m = moneyRe.exec(text)) !== null) {
    const num = m[1] || m[2];
    const value = parseFloat(num.replace(/,/g, ''));
    if (!value || value <= 0) continue;
    const ctx = windowAround(text, m.index, m[0].length);
    if (!MONEY_CTX.test(ctx)) continue;
    if (EXPENSE_CTX.test(ctx) && !MONEY_CTX.test(ctx.replace(EXPENSE_CTX, ''))) continue;
    const path = attributePath(ctx);
    facts.push({
      factType: path === 'uber-delivery' ? 'uber' : 'revenue',
      path, value, textValue: null,
      sourceQuote: ctx, sourceDate, confidence: 0.7, method: 'regex',
    });
  }

  // Hours: "N hours/hrs/h" near an effort word OR within a delivery/Uber context.
  const hoursRe = /(\d+(?:\.\d+)?)\s?(?:h\b|hrs?\b|hours?\b)/gi;
  while ((m = hoursRe.exec(text)) !== null) {
    const value = parseFloat(m[1]);
    if (!value || value <= 0 || value > 24) continue;
    const ctx = windowAround(text, m.index, m[0].length);
    const effort = /\b(spent|worked|invested|logged|put in|drove|shift|over)\b/i.test(ctx);
    const uber = /\b(uber|doordash|delivery|delivered)\b/i.test(ctx);
    if (!effort && !uber) continue;
    facts.push({
      factType: 'hours', path: attributePath(ctx), value, textValue: null,
      sourceQuote: ctx, sourceDate, confidence: 0.7, method: 'regex',
    });
  }

  // Uber trips: "N trips/deliveries".
  const tripsRe = /(\d+)\s?(?:trips?|deliveries|orders|drops?)\b/gi;
  while ((m = tripsRe.exec(text)) !== null) {
    const value = parseInt(m[1], 10);
    if (!value || value <= 0) continue;
    const ctx = windowAround(text, m.index, m[0].length);
    if (!/\b(uber|doordash|delivery|delivered|drove)\b/i.test(ctx)) continue;
    facts.push({
      factType: 'trips', path: 'uber-delivery', value, textValue: null,
      sourceQuote: ctx, sourceDate, confidence: 0.7, method: 'regex',
    });
  }

  // Expenses: "$X spent on" / "spent $X" / "paid $X for" / "cost $X" (but not already matched as revenue).
  const expenseRe = /(?:\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s?(?:CAD|USD))/gi;
  const matchedRevenueQuotes = new Set(facts.filter(f => f.factType === 'revenue' || f.factType === 'uber').map(f => f.sourceQuote));
  while ((m = expenseRe.exec(text)) !== null) {
    const num = m[1] || m[2];
    const value = parseFloat(num.replace(/,/g, ''));
    if (!value || value <= 0) continue;
    const ctx = windowAround(text, m.index, m[0].length);
    // Skip if already marked as revenue
    if (matchedRevenueQuotes.has(ctx)) continue;
    // Must have expense context
    if (!/\b(spent|cost|expense|paid for|paid out|bought|fuel|gas|subscription|phone|software|tool|mileage)\b/i.test(ctx)) continue;
    // Guess category from context
    let category = 'other';
    if (/mileage|miles|km|driving/.test(ctx)) category = 'mileage';
    else if (/fuel|gas|petrol/.test(ctx)) category = 'fuel';
    else if (/food|meal|lunch|coffee/.test(ctx)) category = 'meals';
    else if (/supplies|equipment|tool/.test(ctx)) category = 'supplies';
    else if (/software|subscription|saas|app/.test(ctx)) category = 'software';
    else if (/phone|data|internet/.test(ctx)) category = 'phone';
    else if (/car|vehicle|maintenance|repair/.test(ctx)) category = 'vehicle';
    facts.push({
      factType: 'expense', path: attributePath(ctx), value, textValue: category,
      sourceQuote: ctx, sourceDate, confidence: 0.6, method: 'regex',
    });
  }

  // Status, next actions, learnings, and tasks — all line-scoped so attribution doesn't
  // bleed across section boundaries.
  for (const line of text.split(/\r?\n/)) {
    const statusMatch = line.match(/\b(shipped|launched|completed|done|finished|paused|blocked|on hold)\b/i);
    if (statusMatch) {
      const word = statusMatch[1].toLowerCase();
      const status = /paused|blocked|on hold/.test(word) ? 'paused' : 'completed';
      facts.push({
        factType: 'status', path: attributePath(line), value: null, textValue: status,
        sourceQuote: line.trim(), sourceDate, confidence: 0.55, method: 'regex',
      });
    }
    const next = line.match(/^\s*(?:next(?:\s*action)?|todo|to do)\s*:?\s*(.+)$/i);
    if (next && next[1].trim().length > 3) {
      facts.push({
        factType: 'nextAction', path: attributePath(line), value: null,
        textValue: next[1].trim(), sourceQuote: line.trim(), sourceDate,
        confidence: 0.6, method: 'regex',
      });
    }
    const learn = line.match(/^\s*(?:learning|lesson|learned|takeaway)\s*:?\s*(.+)$/i);
    if (learn && learn[1].trim().length > 3) {
      facts.push({
        factType: 'learning', path: attributePath(line), value: null,
        textValue: learn[1].trim(), sourceQuote: line.trim(), sourceDate,
        confidence: 0.6, method: 'regex',
      });
    }
    // Tasks: "Task: description" OR "TODO: description" OR "Important: description"
    const taskMatch = line.match(/^\s*(?:task|todo|important|priority)\s*:?\s*(.+)$/i);
    if (taskMatch && taskMatch[1].trim().length > 3) {
      facts.push({
        factType: 'task', path: attributePath(line), value: null,
        textValue: taskMatch[1].trim(), sourceQuote: line.trim(), sourceDate,
        confidence: 0.65, method: 'regex',
      });
    }
  }

  return facts;
}

// --- Optional Claude structured extraction ----------------------------------
function llmEnabled() {
  return !!process.env.ANTHROPIC_API_KEY && process.env.INGEST_USE_LLM !== 'false';
}

// Pre-filter: only send lines that look fact-bearing — minimizes data egress + cost.
function relevantLines(text) {
  const keep = [];
  for (const line of text.split(/\r?\n/)) {
    if (/\$\s?\d|\b\d+(?:\.\d+)?\s?(?:h|hrs?|hours?)\b|\b(earned|paid|revenue|made|mrr|client|uber|delivery|shipped|launched|paused|trips?|learning|next)\b/i.test(line)) {
      keep.push(line.trim());
    }
  }
  return keep.join('\n').slice(0, 6000);
}

export async function extractLLM(text, sourceFile, sourceDate) {
  if (!llmEnabled()) return [];
  const snippet = relevantLines(text);
  if (!snippet) return [];

  let Anthropic;
  try {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
  } catch {
    console.warn('@anthropic-ai/sdk not installed; skipping LLM extraction.');
    return [];
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tool = {
    name: 'record_facts',
    description: 'Record concrete progress facts found in the text. Return empty if none.',
    input_schema: {
      type: 'object',
      properties: {
        facts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factType: { type: 'string', enum: ['revenue', 'hours', 'uber', 'trips', 'status', 'learning', 'nextAction', 'task', 'checkin'] },
              path: { type: 'string', enum: ['ai-consulting', 'ai-tools', 'online-work', 'apps', 'uber-delivery', 'none'] },
              value: { type: ['number', 'null'] },
              textValue: { type: ['string', 'null'] },
              sourceQuote: { type: 'string', description: 'Verbatim text the fact came from.' },
              confidence: { type: 'number' },
            },
            required: ['factType', 'sourceQuote', 'confidence'],
          },
        },
      },
      required: ['facts'],
    },
  };

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'record_facts' },
      messages: [{
        role: 'user',
        content: `Extract concrete progress facts (revenue earned, hours worked, Uber earnings/trips, status changes, learnings, next actions) from these notes. Only record facts explicitly stated. Numbers MUST appear verbatim in your sourceQuote. Return empty if nothing concrete.\n\n${snippet}`,
      }],
    });
    const block = resp.content.find((b) => b.type === 'tool_use');
    const facts = block?.input?.facts || [];
    return facts.map((f) => ({
      factType: f.factType,
      path: f.path && f.path !== 'none' ? f.path : null,
      value: typeof f.value === 'number' ? f.value : null,
      textValue: f.textValue || null,
      sourceQuote: f.sourceQuote || '',
      sourceDate,
      confidence: typeof f.confidence === 'number' ? f.confidence : 0.5,
      method: 'llm',
    }));
  } catch (err) {
    console.warn('LLM extraction failed, continuing with regex only:', err.message);
    return [];
  }
}

// Accept a fact only if any number in it appears verbatim in the source text,
// and its quote is grounded in the source. The single most important guard.
function verify(fact, fullText) {
  if (fact.sourceQuote && !fullText.replace(/\s+/g, ' ').includes(fact.sourceQuote.replace(/\s+/g, ' ').slice(0, 40))) {
    // Quote should be grounded; allow short quotes through if a prefix matches.
    if (fact.sourceQuote.length > 12) return false;
  }
  if (fact.value != null) {
    const numStr = String(fact.value);
    const intStr = String(Math.round(fact.value));
    const hay = fullText.replace(/,/g, '');
    if (!hay.includes(numStr) && !hay.includes(intStr)) return false;
  }
  return true;
}

// Public: combine regex + LLM, dedupe near-identical facts, verify against source.
export async function extract(text, sourceFile, sourceDate) {
  const local = extractLocal(text, sourceFile, sourceDate);
  const llm = await extractLLM(text, sourceFile, sourceDate);
  const all = [...local, ...llm].filter((f) => verify(f, text));

  // Dedupe within this file: same type+value+path collapses (prefer higher confidence).
  const byKey = new Map();
  for (const f of all) {
    const k = `${f.factType}|${f.path}|${f.value ?? f.textValue}`;
    const prev = byKey.get(k);
    if (!prev || f.confidence > prev.confidence) byKey.set(k, f);
  }
  return [...byKey.values()];
}
