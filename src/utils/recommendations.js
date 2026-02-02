export function tagScore(baseTags, candidateTags) {
  const a = new Set(baseTags || [])
  const b = new Set(candidateTags || [])

  let intersection = 0
  for (const t of b) {
    if (a.has(t)) intersection += 1
  }

  if (intersection === 0) return 0

  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : intersection / union
}

export function recommendFoodsByTags(foods, tags, excludeFoodIds, limit = 6) {
  const exclude = excludeFoodIds instanceof Set ? excludeFoodIds : new Set(excludeFoodIds || [])
  const baseTags = Array.isArray(tags) ? tags : []

  if (baseTags.length === 0) return []

  return (foods || [])
    .filter((f) => f && !exclude.has(f.id))
    .map((f) => ({ food: f, score: tagScore(baseTags, f.tags || []) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.food)
}
