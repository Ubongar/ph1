import { useState, useCallback, useEffect } from 'react'

interface FormDraftResult<T> {
  draft: T | null
  saveDraft: (data: T) => void
  clearDraft: () => void
  hasDraft: boolean
  draftTime: string | null
}

interface DraftEntry<T> {
  data: T
  savedAt: string
}

export function useFormDraft<T>(formKey: string): FormDraftResult<T> {
  const storageKey = `shr_draft_${formKey}`

  const readDraft = useCallback((): DraftEntry<T> | null => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      return JSON.parse(raw) as DraftEntry<T>
    } catch {
      return null
    }
  }, [storageKey])

  const [entry, setEntry] = useState<DraftEntry<T> | null>(() => readDraft())

  useEffect(() => {
    setEntry(readDraft())
  }, [readDraft])

  const saveDraft = useCallback(
    (data: T) => {
      const newEntry: DraftEntry<T> = { data, savedAt: new Date().toISOString() }
      localStorage.setItem(storageKey, JSON.stringify(newEntry))
      setEntry(newEntry)
    },
    [storageKey],
  )

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setEntry(null)
  }, [storageKey])

  return {
    draft: entry?.data ?? null,
    saveDraft,
    clearDraft,
    hasDraft: entry !== null,
    draftTime: entry?.savedAt ?? null,
  }
}
