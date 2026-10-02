#!/usr/bin/env node
/**
 * Строит public/library.json из плейлистов ~/Music/Music/Radio/*.m3u.
 *
 * Каждый .m3u → один спектакль.
 * Имя плейлиста парсится: «Автор Название, Год.m3u»
 * Содержимое .m3u → массив частей с полями url и backup.
 * Метаданные (актёры, жанры, театр, описание) подтягиваются из scripts/overrides.json.
 * Обложки — public/covers/{slug}.webp (если есть).
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const M3U_DIR     = path.join(os.homedir(), 'Music/Music/Radio')
const OUTPUT      = 'public/library.json'
const OVERRIDES   = 'scripts/overrides.json'
const COVERS_DIR  = 'public/covers'
const BACKUP_URLS = 'scripts/backup-urls.json'
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

/**
 * «Достоевский Ф.М. Игрок, 1956» → { author, title, year }
 */
function parsePlaylistName(name) {
  let work = name.trim()
  let year = null

  // Год в конце: ", 1956" или " 1956"
  const y = work.match(/[,\s]+(\d{4})\s*$/)
  if (y) {
    year = parseInt(y[1], 10)
    work = work.slice(0, y.index).trim()
  }

  // Автор: «Фамилия И.О.» или «Фамилия И.»
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
 * Парсит .m3u — возвращает массив URL (без #EXTINF, комментариев).
 * #EXTM3U не обязателен.
 */
function parseM3U(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8')
  const urls = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (/^https?:\/\//i.test(line)) urls.push(line)
  }
  return urls
}

/**
 * Достаёт номер части из имени файла в URL.
 * «02_wilde-portret1.mp3»        → 1
 * «wilde-portret5titr.mp3»       → titr, 5
 * «kup-alisa.mp3»                → null (без номера)
 */
function parseUrlFilename(url) {
  const fname = url.split('/').pop().toLowerCase()

  // titr
  const t = fname.match(/(\d+)titr/)
  if (t) return { isTitr: true, titrN: parseInt(t[1], 10), num: null }

  // обычная часть — последнее число перед расширением
  const n = fname.match(/(\d+)(?=\.\w+$)/)
  return { isTitr: false, titrN: null, num: n ? parseInt(n[1], 10) : null }
}

/**
 * Сортировка частей:
 *  1) 0titr → самое начало (группа 0)
 *  2) обычные части по номеру (группа 1)
 *  3) N titr (N>0) → конец (группа 2)
 */
function sortKey(url) {
  const p = parseUrlFilename(url)
  if (p.isTitr) {
    if (p.titrN === 0) return [0, 0]
    return [2, p.titrN]
  }
  return [1, p.num ?? 999]
}

/**
 * Заголовок части для UI.
 */
function partTitle(url, index, total) {
  const p = parseUrlFilename(url)
  if (p.isTitr) {
    return p.titrN === 0 ? 'Титр (вступление)' : 'Титр (завершение)'
  }
  // нумеруем только не-titr части
  return `Часть ${index + 1}`
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
    const folder = path.basename(file, '.m3u')   // имя плейлиста = folder
    const fullPath = path.join(M3U_DIR, file)
    const urls = parseM3U(fullPath)

    if (urls.length === 0) {
      console.log(`  ⚠️  ${file}: нет URL, пропуск`)
      continue
    }

    // Сортируем части с учётом titr
    const sorted = [...urls].sort((a, b) => {
      const [ga, na] = sortKey(a)
      const [gb, nb] = sortKey(b)
      return ga - gb || na - nb
    })

    // Парсим имя плейлиста
    const parsed = parsePlaylistName(folder)
    const ov = overrides[folder] || {}
    if (Object.keys(ov).length === 0) withoutOverrides++

    // Формируем части
    let partIdx = 0
    const backupAll = backupUrls[folder] || null

    const parts = sorted.map((url, i) => {
      const p = parseUrlFilename(url)
      const isTitr = p.isTitr
      const title = isTitr
        ? (p.titrN === 0 ? 'Титр (вступление)' : 'Титр (завершение)')
        : `Часть ${++partIdx}`

      return {
        id: `p${i + 1}`,
        title,
        url,
        backup: backupAll,
        isTitr,
      }
    })

    // Slug
    let slug = slugify(parsed.title + (parsed.year ? '-' + parsed.year : ''))
    if (usedSlugs.has(slug)) {
      usedSlugs.set(slug, usedSlugs.get(slug) + 1)
      slug += '-' + usedSlugs.get(slug)
    } else {
      usedSlugs.set(slug, 1)
    }

    // Обложка: сначала overrides, потом public/covers/{slug}.webp
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
      actors: ov.actors ?? [],
      genre: ov.genre ?? [],
      tags: ov.tags ?? [],
      description: ov.description ?? null,
      cover,
      folder,
      parts,
      partCount: parts.length,
    }

    library.push(play)
    totalParts += parts.length
  }

  // Сортировка спектаклей по названию
  library.sort((a, b) => a.title.localeCompare(b.title, 'ru'))

  fs.writeFileSync(OUTPUT, JSON.stringify(library, null, 2), 'utf-8')

  console.log(`\n✅ ${OUTPUT}`)
  console.log(`   Спектаклей:      ${library.length}`)
  console.log(`   Частей:          ${totalParts}`)
  console.log(`   Без overrides:   ${withoutOverrides}`)
  console.log(`   Без обложки:     ${withoutCover}`)
}

main().catch(e => { console.error(e); process.exit(1) })
