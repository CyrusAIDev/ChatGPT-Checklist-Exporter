import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  type InputItem = { id: string; text: string }
  const { items } = await req.json() as { items: InputItem[] }
  if (!Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ error: 'items must be a non-empty array' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const prompt = `You are an intelligent checklist organizer. Reorganize the given items into logical groups.

RULES:
- Group related items together under a short, clear group name (1–3 words)
- Combine duplicate or near-identical items: list all their IDs in sourceIds, write one clean merged text
- Every input ID must appear in exactly one group item's sourceIds — no IDs may be omitted or duplicated
- Aim for 2–5 groups (use 1 only if all items belong to the same topic)
- Rewrite items to be concise and actionable; preserve meaning exactly
- Keep checked/completion state in mind — don't split steps that belong together

Return ONLY valid JSON (no markdown, no code fences, no commentary):
{
  "groups": [
    {
      "name": "Group Name",
      "items": [
        {"sourceIds": ["id1", "id2"], "text": "Concise merged task"},
        {"sourceIds": ["id3"], "text": "Another task"}
      ]
    }
  ]
}

Input items:
${JSON.stringify(items)}`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => '')
    return new Response(JSON.stringify({ error: 'AI service error', detail: errText }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const aiData = await anthropicRes.json()
  const rawText: string = aiData.content?.[0]?.text ?? ''

  // Strip markdown code fences if model wrapped the JSON
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  type RawItem = { sourceIds: string[]; text: string }
  type RawGroup = { name: string; items: RawItem[] }
  let groups: RawGroup[]

  try {
    const parsed = JSON.parse(jsonText) as { groups: RawGroup[] }
    if (!Array.isArray(parsed.groups) || parsed.groups.length === 0) throw new Error('no groups')

    // Validate every input ID is accounted for
    const inputIds = new Set(items.map(i => i.id))
    const seenIds = new Set<string>()
    for (const g of parsed.groups) {
      for (const item of g.items) {
        for (const id of item.sourceIds) {
          if (seenIds.has(id)) throw new Error(`duplicate id: ${id}`)
          seenIds.add(id)
        }
      }
    }
    // Any missing IDs? Append them as-is to the last group
    for (const id of inputIds) {
      if (!seenIds.has(id)) {
        const original = items.find(i => i.id === id)!
        parsed.groups[parsed.groups.length - 1].items.push({
          sourceIds: [id],
          text: original.text,
        })
      }
    }

    groups = parsed.groups
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response', raw: rawText, detail: String(e) }),
      { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ groups }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
