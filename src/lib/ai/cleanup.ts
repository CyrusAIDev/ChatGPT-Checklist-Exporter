import { supabase } from '../supabase/client'
import type { ChecklistItem, ChecklistGroup } from '../../types/checklist'

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
