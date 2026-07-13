const IMAGE_PROMPT = `看这张食物照片，估算照片中所有食物的总热量和营养成分。
用户补充说明："{DESC}"
请参考用户的补充说明来辅助判断食物种类、份量和烹饪方式。

只返回一个 JSON，不要其他文字：
{"description":"用中文简短描述食物","cal":总热量整数千卡,"carb":碳水整数克,"protein":蛋白质整数克,"fat":脂肪整数克}`;

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
  const imageBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const prompt = IMAGE_PROMPT.replace('{DESC}', description || 'none');

  const result = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
    messages: [{ role: 'user', content: prompt }],
    image: [...imageBytes],
  });

  const text = result.response || result.description || JSON.stringify(result);
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return json({ error: 'parse failed', raw: text }, 500);

  const parsed = JSON.parse(match[0]);
  parsed.cal = Math.round(parsed.cal || 0);
  parsed.carb = Math.round(parsed.carb || 0);
  parsed.protein = Math.round(parsed.protein || 0);
  parsed.fat = Math.round(parsed.fat || 0);
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
