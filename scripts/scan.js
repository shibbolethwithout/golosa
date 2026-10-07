#!/usr/bin/env node
/**
 * Строит public/library.json из плейлистов ~/Music/Music/Radio/*.m3u.
 * Читает названия из #EXTINF.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const M3U_DIR     = path.join(os.homedir(), 'Music/Music/Radio')
const OUTPUT      = 'public/library.json'
const OVERRIDES   = 'scripts/overrides.json'
const BACKUP_URLS = 'scripts/backup-urls.json'
const COVERS_DIR  = 'public/covers'

// ─────────────────────────────────────────────────────
//  Утилиты
// ─────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^\wа-яё\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function parsePlaylistName(name) {
  let work = name.trim()
  let year = null
  const y = work.match(/[,\s]+(\d{4})\s*$/)
  if (y) {
    year = parseInt(y[1], 10)
    work = work.slice(0, y.index).trim()
  }
  let author = null
  let title = work
  const re = /^([А-ЯЁ][А-ЯЁа-яё\-]*(?:\s+[А-ЯЁ][А-ЯЁа-яё\-]*)*\s+[А-ЯЁ]\.(?:\s*[А-ЯЁ]\.)?)\s+(.+)$/
  const m = work.match(re)
  if (m && m[2].length >= 2) {
    author = m[1].trim()
    title = m[2].trim()
  }
  return { title, author, year }
}

/**
 * Парсит .m3u — возвращает массив { url, title }.
 * title — из строки #EXTINF над URL (если есть).
 */
function parseM3U(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8')
  const entries = []
  let pendingTitle = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',')
      pendingTitle = comma >= 0 ? line.slice(comma + 1).trim() : null
    } else if (line.startsWith('#')) {
      continue
    } else if (/^https?:\/\//i.test(line)) {
      entries.push({ url: line, title: pendingTitle })
      pendingTitle = null
    }
  }
  return entries
}

/**
 * Достаёт номер части и titr из URL (по имени файла в конце пути).
 */
function parseUrlFilename(url) {
  const fname = String(url).split('/').pop().toLowerCase()
  const t = fname.match(/(\d+)titr/)
  if (t) return { isTitr: true, titrN: parseInt(t[1], 10), num: null }
  const n = fname.match(/(\d+)(?=\.\w+$)/)
  return { isTitr: false, titrN: null, num: n ? parseInt(n[1], 10) : null }
}

/**
 * Сортировка: 0titr → начало, обычные части по номеру, N titr → конец.
 */
function sortKey(url) {
  const p = parseUrlFilename(url)
  if (p.isTitr) {
    if (p.titrN === 0) return [0, 0]
    return [2, p.titrN]
  }
  return [1, p.num ?? 999]
}

// ─────────────────────────────────────────────────────
//  Основная логика
// ─────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(M3U_DIR)) {
    console.error(`❌ Папка плейлистов не найдена: ${M3U_DIR}`)
    process.exit(1)
  }

  const overrides = fs.existsSync(OVERRIDES)
    ? JSON.parse(fs.readFileSync(OVERRIDES, 'utf-8'))
    : {}

  const backupUrls = fs.existsSync(BACKUP_URLS)
    ? JSON.parse(fs.readFileSync(BACKUP_URLS, 'utf-8'))
    : {}

  const playlists = fs.readdirSync(M3U_DIR)
    .filter(f => f.toLowerCase().endsWith('.m3u'))
    .sort()

  console.log(`📁 Плейлистов найдено: ${playlists.length}`)

  const library = []
  const usedSlugs = new Map()

  let totalParts = 0
  let withoutOverrides = 0
  let withoutCover = 0

  for (const file of playlists) {
    const folder = path.basename(file, '.m3u')
    const fullPath = path.join(M3U_DIR, file)

    // entries = [{ url, title }]
    const entries = parseM3U(fullPath)

    if (entries.length === 0) {
      console.log(`  ⚠️  ${file}: нет URL, пропуск`)
      continue
    }

    // Сортируем — передаём URL (строку), не объект
    const sorted = [...entries].sort((a, b) => {
      const [ga, na] = sortKey(a.url)
      const [gb, nb] = sortKey(b.url)
      return ga - gb || na - nb
    })

    const parsed = parsePlaylistName(folder)
    const ov = overrides[folder] || {}
    if (Object.keys(ov).length === 0) withoutOverrides++

    const backupAll = backupUrls[folder] || null

    // Формируем части
    let partIdx = 0
    const parts = sorted.map(({ url, title: extTitle }, i) => {
      const p = parseUrlFilename(url)
      const isTitr = p.isTitr

      let title
      if (extTitle) {
        // Название из #EXTINF — «Петербургский ростовщик — часть 1»
        title = extTitle
      } else if (isTitr) {
        title = p.titrN === 0 ? 'Титр (вступление)' : 'Титр (завершение)'
      } else {
        title = `Часть ${++partIdx}`
      }

      return {
        id: `p${i + 1}`,
        title,
        url,
        backup: backupAll,
        isTitr,
      }
    })

    let slug = slugify(parsed.title + (parsed.year ? '-' + parsed.year : ''))
    if (usedSlugs.has(slug)) {
      usedSlugs.set(slug, usedSlugs.get(slug) + 1)
      slug += '-' + usedSlugs.get(slug)
    } else {
      usedSlugs.set(slug, 1)
    }

    let cover = ov.cover || null
    if (!cover) {
      const guess = path.join(COVERS_DIR, `${slug}.webp`)
      if (fs.existsSync(guess)) {
        cover = '/' + guess.replace(/^public\//, '')
      } else {
        withoutCover++
      }
    }

    const play = {
      id: slug,
      slug,
      title: ov.title ?? parsed.title,
      author: ov.author ?? parsed.author,
      year: ov.year ?? parsed.year,
      theatre: ov.theatre ?? null,
      directors: ov.directors || [],
      actors: ov.actors || [],
      genre: ov.genre || [],
      tags: ov.tags || [],
      description: ov.description ?? null,
      cover,
      folder,
      parts,
      partCount: parts.length,
    }

    library.push(play)
    totalParts += parts.length
  }

  library.sort((a, b) => a.title.localeCompare(b.title, 'ru'))

  fs.writeFileSync(OUTPUT, JSON.stringify(library, null, 2), 'utf-8')

  console.log(`\n✅ ${OUTPUT}`)
  console.log(`   Спектаклей:      ${library.length}`)
  console.log(`   Частей:          ${totalParts}`)
  console.log(`   Без overrides:   ${withoutOverrides}`)
  console.log(`   Без обложки:     ${withoutCover}`)
}

main().catch(e => { console.error(e); process.exit(1) })
