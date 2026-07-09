import { supabase } from '../supabase/client'
import type { ChecklistItem, ChecklistGroup } from '../../types/checklist'

/**
 * Smart-place mode: send only NEW items (those without a groupId) to the AI
 * and ask it to assign each one to an existing group by name.
 * Returns a Map<itemId, existingGroupId>.
 * Falls back to the last group when the AI returns an unrecognised name.
 */
export async function fetchSmartPlaceResult(
  newItems: ChecklistItem[],
  existingGroups: ChecklistGroup[],
): Promise<Map<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  // Only use top-level groups as targets (subgroups would confuse the AI)
  const topGroups = existingGroups.filter(g => !g.parentId)

  const { data, error } = await supabase.functions.invoke('clean-checklist', {
    body: {
      items: newItems.map(i => ({ id: i.id, text: i.text })),
      existingGroups: topGroups.map(g => ({ name: g.name })),
    },
    headers,
  })

  if (error) {
    const detail = (error as unknown as { context?: { text?: () => Promise<string> } }).context
    const body = detail?.text ? await detail.text().catch(() => '') : ''
    throw new Error(body ? `${error.message}: ${body}` : (error.message ?? 'AI service error'))
  }

  type RawItem = { sourceIds: string[]; text: string }
  type RawGroup = { name: string; items: RawItem[]; subgroups?: { items: RawItem[] }[] }
  const rawGroups: RawGroup[] = (data as { groups: RawGroup[] }).groups

  // Build name → existing groupId map (case-insensitive)
  const nameToId = new Map<string, string>()
  for (const g of topGroups) {
    nameToId.set(g.name.toLowerCase().trim(), g.id)
  }
  const fallbackId = topGroups[topGroups.length - 1]?.id

  const assignments = new Map<string, string>()
  for (const raw of rawGroups) {
    const groupId = nameToId.get(raw.name.toLowerCase().trim()) ?? fallbackId
    if (!groupId) continue
    // Direct items
    for (const item of raw.items ?? []) {
      for (const id of item.sourceIds) assignments.set(id, groupId)
    }
    // Subgroup items (flatten into the parent group)
    for (const sub of raw.subgroups ?? []) {
      for (const item of sub.items ?? []) {
        for (const id of item.sourceIds) assignments.set(id, groupId)
      }
    }
  }

  return assignments
}

export type OrganizeItemUpdate = {
  keepId: string     // ID of the surviving item
  mergeIds: string[] // IDs of duplicates to archive
  text: string       // New (possibly rewritten) text
  groupId: string    // Group this item belongs to
  order: number      // Order within its group
}

export type OrganizeResult = {
  groups: ChecklistGroup[]
  itemUpdates: OrganizeItemUpdate[]
}

export async function fetchOrganizeResult(
  activeItems: ChecklistItem[],
): Promise<OrganizeResult> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const { data, error } = await supabase.functions.invoke('clean-checklist', {
    body: { items: activeItems.map(i => ({ id: i.id, text: i.text })) },
    headers,
  })

  if (error) {
    const detail = (error as unknown as { context?: { text?: () => Promise<string> } }).context
    const body = detail?.text ? await detail.text().catch(() => '') : ''
    throw new Error(body ? `${error.message}: ${body}` : (error.message ?? 'AI service error'))
  }

  type RawItem = { sourceIds: string[]; text: string }
  type RawSubgroup = { name: string; items: RawItem[] }
  type RawGroup = { name: string; subgroups?: RawSubgroup[]; items: RawItem[] }
  const rawGroups: RawGroup[] = (data as { groups: RawGroup[] }).groups
  const now = Date.now()

  const groups: ChecklistGroup[] = []
  const itemUpdates: OrganizeItemUpdate[] = []

  rawGroups.forEach((g, gi) => {
    const topId = `grp-${now}-${gi}`
    groups.push({ id: topId, name: g.name, collapsed: false, order: gi })

    // Items placed directly in the top-level group
    ;(g.items ?? []).forEach((item, ii) => {
      const [keepId, ...mergeIds] = item.sourceIds
      if (!keepId) return
      itemUpdates.push({ keepId, mergeIds, text: item.text, groupId: topId, order: ii })
    })

    // Subgroups
    ;(g.subgroups ?? []).forEach((sub, si) => {
      const subId = `grp-${now}-${gi}-${si}`
      groups.push({ id: subId, name: sub.name, collapsed: false, order: si, parentId: topId })
      ;(sub.items ?? []).forEach((item, ii) => {
        const [keepId, ...mergeIds] = item.sourceIds
        if (!keepId) return
        itemUpdates.push({ keepId, mergeIds, text: item.text, groupId: subId, order: ii })
      })
    })
  })

  return { groups, itemUpdates }
}
