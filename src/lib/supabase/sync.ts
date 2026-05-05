import type { ChecklistRecord } from '../../types/checklist'
import { getChecklist, setChecklist } from '../storage/checklist-repo'
import { supabase } from './client'

export async function syncRecord(record: ChecklistRecord, userId: string): Promise<void> {
  const { error } = await supabase.from('checklists').upsert(
    {
      user_id: userId,
      conversation_id: record.conversationId,
      record,
      updated_at: new Date(record.updatedAt).toISOString(),
      created_at: new Date(record.createdAt).toISOString(),
    },
    { onConflict: 'user_id,conversation_id' },
  )
  if (error) console.warn('[sync] syncRecord failed', error)
}

export async function deleteRecord(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
  if (error) console.warn('[sync] deleteRecord failed', error)
}

export async function pullAndMergeAll(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('checklists')
    .select('conversation_id, record, updated_at')
    .eq('user_id', userId)
  if (error || !data) {
    console.warn('[sync] pullAndMergeAll failed', error)
    return
  }
  for (const row of data) {
    const remote = row.record as ChecklistRecord
    if (!remote?.conversationId) continue
    const local = await getChecklist(remote.conversationId)
    if (!local || remote.updatedAt > local.updatedAt) {
      await setChecklist(remote)
    }
  }
}
