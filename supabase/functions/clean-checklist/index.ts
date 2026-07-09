import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Repair common AI JSON mistakes before passing to JSON.parse.
 * Main case: unescaped ASCII double-quote characters inside a string value.
 *
 * Strategy: walk character by character; when inside a string, if we hit a `"`
 * that is NOT followed by a JSON-structural character (: , } ] newline EOF),
 * treat it as an unescaped internal quote and escape it.
 */
function sanitizeJson(raw: string): string {
  let out = ''
  let i = 0
  const len = raw.length
  let inString = false

  while (i < len) {
    const ch = raw[i]

    if (!inString) {
      if (ch === '"') inString = true
      out += ch
      i++
      continue
    }

    // Inside a string ──────────────────────────────────────────────
    if (ch === '\\') {
      // Escape sequence — pass both characters through unchanged
      out += ch
      i++
      if (i < len) { out += raw[i]; i++ }
      continue
    }

    if (ch === '"') {
      // Peek ahead (skip spaces/tabs) to decide: closing quote or internal?
      let j = i + 1
      while (j < len && (raw[j] === ' ' || raw[j] === '\t')) j++
      const next = j < len ? raw[j] : ''

      // After a real closing quote the next structural char is one of these:
      if (
        next === ':' || next === ',' || next === '}' || next === ']' ||
        next === '\n' || next === '\r' || next === ''
      ) {
        inString = false
        out += ch            // closing quote, keep as-is
      } else {
        out += '\\"'         // unescaped internal quote — escape it
      }
      i++
      continue
    }

    // Also replace Unicode curly/smart quotes inside strings with straight equivalents
    if (ch === '“' || ch === '„') { out += '\\"'; i++; continue }
    if (ch === '”' || ch === '‟') { out += '\\"'; i++; continue }

    out += ch
    i++
  }

  return out
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
  type ExistingGroup = { name: string }
  const body = await req.json() as { items: InputItem[]; existingGroups?: ExistingGroup[] }
  const { items, existingGroups } = body
  if (!Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ error: 'items must be a non-empty array' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const isSmartPlace = Array.isArray(existingGroups) && existingGroups.length > 0

  const sharedQuoteRule =
    "- Never use double quotation marks (\") inside item or group name text. " +
    "Use single quotes (') to quote any term — e.g. write 'People Also Ask' not \"People Also Ask\"."

  const prompt = isSmartPlace
    ? `You are a checklist organizer. Place each new task into the most appropriate group from the list below. Do not create new groups.

ALLOWED GROUPS (use these names EXACTLY as written — do not invent new group names):
${existingGroups!.map(g => `- "${g.name}"`).join('\n')}

RULES:
- Assign every item to exactly one group from the list above.
- Use the group names EXACTLY as shown — no variations, no new groups.
- If an item could fit multiple groups, pick the best match; if truly unsure, use the last group.
- Combine duplicate or near-identical items: list all their IDs in sourceIds, write one clean text.
- Every input ID must appear in exactly one item's sourceIds — no omissions, no duplicates.
- Keep item text concise and actionable; preserve meaning exactly.
${sharedQuoteRule}

Return ONLY valid JSON (no markdown, no code fences, no commentary):
{
  "groups": [
    {
      "name": "Exact Group Name From List",
      "items": [{"sourceIds": ["id1"], "text": "Task text"}]
    }
  ]
}

Only include groups that have at least one item assigned.

Items to place:
${JSON.stringify(items)}`
    : `You are an intelligent checklist organizer. Reorganize the given items into logical groups with optional subgroups.

RULES:
- Group related items under a short, clear group name (1–3 words). Aim for 2–5 top-level groups.
- Optionally add subgroups within a group when 3+ items form a tight cluster. Use at most 2–3 subgroups per group, only when they genuinely clarify structure. Items NOT in a subgroup go directly in the group's "items" array.
- Combine duplicate or near-identical items: list all their IDs in sourceIds, write one clean merged text.
- Every input ID must appear in exactly one item's sourceIds — no IDs may be omitted or duplicated.
- Rewrite items to be concise and actionable; preserve meaning exactly.
${sharedQuoteRule}

Return ONLY valid JSON (no markdown, no code fences, no commentary):
{
  "groups": [
    {
      "name": "Group Name",
      "subgroups": [
        {
          "name": "Subgroup Name",
          "items": [{"sourceIds": ["id1"], "text": "Task in subgroup"}]
        }
      ],
      "items": [
        {"sourceIds": ["id2", "id3"], "text": "Task directly in group (merged)"},
        {"sourceIds": ["id4"], "text": "Another direct task"}
      ]
    }
  ]
}

"subgroups" is optional — omit it or use [] when no subgrouping is needed.

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
      max_tokens: 8192,
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
  type RawSubgroup = { name: string; items: RawItem[] }
  type RawGroup = { name: string; subgroups?: RawSubgroup[]; items: RawItem[] }
  let groups: RawGroup[]

  // Two-attempt parse: first try the raw text, then a sanitized version
  const tryParse = (text: string): { groups: RawGroup[] } | null => {
    try {
      const p = JSON.parse(text) as { groups: RawGroup[] }
      if (!Array.isArray(p.groups) || p.groups.length === 0) return null
      return p
    } catch {
      return null
    }
  }

  const parsed = tryParse(jsonText) ?? tryParse(sanitizeJson(jsonText))

  if (!parsed) {
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response', raw: rawText, detail: 'JSON parse failed after sanitization attempt' }),
      { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  try {
    // Collect all items from both top-level and subgroup items
    const allRawItems = (g: RawGroup): RawItem[] => [
      ...(g.items ?? []),
      ...(g.subgroups ?? []).flatMap(s => s.items ?? []),
    ]

    // Validate every input ID is accounted for exactly once
    const inputIds = new Set(items.map(i => i.id))
    const seenIds = new Set<string>()
    for (const g of parsed.groups) {
      for (const item of allRawItems(g)) {
        for (const id of item.sourceIds) {
          if (seenIds.has(id)) throw new Error(`duplicate id: ${id}`)
          seenIds.add(id)
        }
      }
    }
    // Any missing IDs? Append them as-is to the last group's items
    for (const id of inputIds) {
      if (!seenIds.has(id)) {
        const original = items.find(i => i.id === id)!
        parsed.groups[parsed.groups.length - 1].items.push({ sourceIds: [id], text: original.text })
      }
    }

    groups = parsed.groups
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Failed to validate AI response', raw: rawText, detail: String(e) }),
      { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ groups }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
