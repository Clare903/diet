const IMAGE_PROMPT = `看这张食物照片，估算所有食物的总热量和营养成分。
用户补充说明："{DESC}"
只返回JSON：{"description":"简短中文食物名","cal":千卡整数,"carb":碳水克数,"protein":蛋白质克数,"fat":脂肪克数}`;

const IMAGE_PROMPT_EN = `Identify food in this photo. User note: "{DESC}".
Return ONLY JSON: {"description":"2-6字中文食物名","cal":kcal_int,"carb":grams_int,"protein":grams_int,"fat":grams_int}
Example: {"description":"冰拿铁","cal":150,"carb":15,"protein":5,"fat":7}
NO other text.`;

const FOOD_PROMPT = `Tell me the nutritional content of "{FOOD}" per 100 grams.

Return ONLY a JSON object, no other text:
{"name":"{FOOD}","cal":integer_kcal_per_100g,"carb":number_grams,"protein":number_grams,"fat":number_grams,"defaultG":typical_serving_grams_integer,"unit":"份/个/杯/碗 etc"}`;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }

    try {
      const body = await request.json();

      if (body.food) {
        return await handleFoodQuery(env, body.food);
      } else if (body.image) {
        return await handleImageAnalysis(env, body);
      }
      return json({ error: 'missing image or food' }, 400);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};

async function handleFoodQuery(env, food) {
  const prompt = FOOD_PROMPT.replaceAll('{FOOD}', food);
  const result = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
  });

  let text = typeof result.response === 'string' ? result.response : JSON.stringify(result);
  let parsed;
  try {
    const outer = JSON.parse(text);
    parsed = outer.response || outer;
  } catch(e) {
    const match = text.match(/\{[^{}]*\}/);
    if (!match) return json({ error: 'parse failed', raw: text }, 500);
    parsed = JSON.parse(match[0]);
  }
  parsed.name = parsed.name || food;
  parsed.defaultG = Math.round(parsed.defaultG) || 100;
  parsed.unit = parsed.unit || '份';
  parsed.cal = Math.round(parsed.cal);
  parsed.carb = Math.round(parsed.carb);
  parsed.protein = Math.round(parsed.protein);
  parsed.fat = Math.round(parsed.fat);
  return json(parsed);
}

async function handleImageAnalysis(env, body) {
  const { image, description } = body;
  let base64 = image.includes(',') ? image.split(',')[1] : image;
  base64 = base64.replace(/\s/g, '');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);

  const mimeMatch = image.match(/^data:(image\/\w+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  if (env.CLAUDE_KEY) {
    return await analyzeWithClaude(env, base64, mimeType, description);
  }
  return await analyzeWithCfAI(env, base64, mimeType, description);
}

async function analyzeWithClaude(env, base64, mimeType, description) {
  const prompt = IMAGE_PROMPT.replace('{DESC}', description || '无');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: 'Claude API error', status: resp.status, detail: err }, 500);
  }

  const result = await resp.json();
  const text = result.content?.[0]?.text || '';
  return parseResult(text, description);
}

async function analyzeWithCfAI(env, base64, mimeType, description) {
  const prompt = IMAGE_PROMPT_EN.replace('{DESC}', description || 'none');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const result = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }],
  });

  let text = '';
  if (typeof result === 'string') text = result;
  else if (typeof result.response === 'string') text = result.response;
  else if (typeof result.description === 'string') text = result.description;
  else text = JSON.stringify(result);
  return parseResult(text, description);
}

function parseResult(text, description) {
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return json({ error: 'parse failed', raw: text.slice(0, 300) }, 500);

  const parsed = JSON.parse(match[0]);
  parsed.cal = Math.round(parsed.cal || 0);
  parsed.carb = Math.round(parsed.carb || 0);
  parsed.protein = Math.round(parsed.protein || 0);
  parsed.fat = Math.round(parsed.fat || 0);
  if (!parsed.description || !parsed.description.trim()) {
    parsed.description = description || '食物';
  }
  return json(parsed);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
