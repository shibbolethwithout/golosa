import Fuse from 'fuse.js'

let fuse = null
let originalLibrary = []

// ё → е (унификация русского поиска)
const norm = (s) => (s || '').toString().toLowerCase().replace(/ё/g, 'е')

function prepareItem(item) {
  return {
    ...item,
    title: norm(item.title),
    author: norm(item.author),
    theatre: norm(item.theatre),
    actors: (item.actors || []).map(norm),
    genre: (item.genre || []).map(norm),
    tags: (item.tags || []).map(norm),
    year: item.year,
  }
}

export function buildIndex(library) {
  originalLibrary = library
  const prepared = library.map(prepareItem)

  fuse = new Fuse(prepared, {
    keys: [
      { name: 'title', weight: 2.0 },
      { name: 'author', weight: 1.5 },
      { name: 'actors', weight: 1.3 },
      { name: 'theatre', weight: 1.1 },
      { name: 'genre', weight: 1.0 },
      { name: 'tags', weight: 0.8 },
      { name: 'year', weight: 0.5 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })
}

export function search(query) {
  if (!query || !fuse) return null
  const results = fuse.search(norm(query))
  const seen = new Set()
  const out = []
  for (const r of results) {
    const original = originalLibrary.find(p => p.id === r.item.id)
    if (original && !seen.has(original.id)) {
      seen.add(original.id)
      out.push(original)
    }
  }
  return out
}

export function applyFilter(list, filter) {
  if (!filter) return list
  const nv = norm(filter.value)
  return list.filter(play => {
    switch (filter.type) {
      case 'author':   return norm(play.author) === nv
      case 'actor':    return (play.actors || []).some(a => norm(a) === nv)
      case 'genre':    return (play.genre || []).some(g => norm(g) === nv)
      case 'tag':      return (play.tags || []).some(t => norm(t) === nv)
      case 'theatre':  return norm(play.theatre) === nv
      case 'decade':   return play.year && Math.floor(play.year / 10) * 10 === filter.value
      default:         return true
    }
  })
}
