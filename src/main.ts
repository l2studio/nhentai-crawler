import { NHentaiAPI, Galleries, Gallery, Image, Tag } from '@l2studio/nhentai-api'
import { TagNamespaceMappings } from './interface'
import TagModel, { TagDocument } from './tag.model'
import BookModel, { BookDocument } from './book.model'
import cron from 'node-cron'
import path from 'path'
import fs from 'fs'

const debug = require('debug')('lgou2w:nhentai-crawler')
const nhentai = new NHentaiAPI({
  proxy: process.env.PROXY_HOST && process.env.PROXY_PORT
    ? { host: process.env.PROXY_HOST, port: parseInt(process.env.PROXY_PORT) }
    : undefined,
  userAgent: process.env.USER_AGENT,
  cookie: process.env.COOKIE
})

const runDir = path.resolve(__dirname)
const dataDir = path.resolve(runDir, '..', 'data')

debug('工作目录：', runDir)
fs.existsSync(dataDir) || fs.mkdirSync(dataDir)

async function saveBookTags (tags: Tag[]): Promise<TagDocument[]> {
  if (!tags || tags.length <= 0) return []
  const identifies = tags.map((tag) => tag.id)

  debug('查询标签：', identifies.join('，'))
  const docs: TagDocument[] = await TagModel.find({ identify: { $in: identifies } })
  for (const tag of tags) {
    const doc = docs.find((doc) => doc.identify === tag.id)
    if (!doc) {
      // 标签未存在，录入标签数据
      debug('录入标签：[%s] %d：%s', tag.type, tag.id, tag.name)
      const namespace = TagNamespaceMappings[tag.type]
      const model = new TagModel({
        identify: tag.id,
        namespace,
        value: tag.name,
        count: tag.count
      })
      await model.save()
      docs.push(model)
    } else {
      // 标签已存在，判断是否需要同步数量状态
      if (doc.count < tag.count) {
        debug('同步标签：[%s] %d：数量 %d -> %d', tag.type, tag.id, doc.count, tag.count)
        await TagModel.updateOne({ _id: doc._id }, { $set: { count: tag.count } })
      }
    }
  }
  return docs
}

async function saveBook (g: Gallery): Promise<BookDocument> {
  debug('查询本子：', g.id)
  let book: BookDocument | null = await BookModel.findOne({ identify: g.id })
  if (book) {
    debug('本子模型 %d 已录入，日期：', g.id, book._id.getTimestamp().toISOString())
    return book
  }
  const tags = await saveBookTags(g.tags)
  debug('轻量化图片...')
  const thumb = lightweightImage(g.images.thumbnail)
  const cover = lightweightImage(g.images.cover)
  const pages = lightweightImages(g.images.pages)
  debug('录入本子模型...')
  book = await new BookModel({
    identify: g.id,
    mediaIdentify: g.media_id,
    title: g.title,
    images: { thumb, cover, pages },
    tags,
    uploadDate: g.upload_date,
    pages: g.num_pages
  }).save()
  return book
}

function lightweightImage (image: Image): string {
  return `${image.w}.${image.h}.${image.t}`
}

function lightweightImages (images: Image[]): string[] {
  if (!images || images.length <= 0) return []

  const result: string[] = []
  let curr: typeof images[0]
  let same = 0
  for (let i = 0; i < images.length; i++) {
    curr = images[i]
    const next = images[i + 1]
    if (next && next.w === curr.w && next.h === curr.h && next.t === curr.t) {
      ++same
    } else {
      const sameFlag = same > 0 ? `+${same}` : ''
      result.push(`${curr.w}.${curr.h}.${curr.t}${sameFlag}`)
      same = 0
    }
  }
  return result
}

async function fetchCurrentTotalPages (): Promise<number> {
  debug('获取当前时间 %s 的总页数...', new Date().toISOString())
  return nhentai.fetchAll(1).then((result) => result.num_pages)
}

async function fetchGalleries (page: number): Promise<Galleries> {
  debug('获取第 %d 页的本子数据集...', page)
  return nhentai.fetchAll(page)
}

const cursorDataFile = path.resolve(dataDir, 'cursor.json')

function readCursorData (): { cursor: number, lastTotalPages: number } {
  debug('读取光标数据文件：', cursorDataFile)
  return fs.existsSync(cursorDataFile)
    ? JSON.parse(fs.readFileSync(cursorDataFile, { encoding: 'utf-8' }))
    : { cursor: 0, lastTotalPages: 0 }
}

function writeCursorData (cursor: number, lastTotalPages: number) {
  debug('写入光标数据文件：cursor=%d，lastTotalPages=%d', cursor, lastTotalPages)
  const data = JSON.stringify({ cursor, lastTotalPages })
  fs.writeFileSync(cursorDataFile, data)
}

let { cursor, lastTotalPages } = readCursorData()
let looping = false

async function run () {
  if (looping) {
    debug('已有任务正在运行，跳过')
    return
  }
  const currTotalPages = await fetchCurrentTotalPages()
  if (!cursor) {
    cursor = lastTotalPages = currTotalPages
    writeCursorData(cursor, lastTotalPages)
  }
  if (lastTotalPages < currTotalPages) {
    debug('最后一次的总页 %d 小于当前时间总页数 %d，目前光标为：', lastTotalPages, currTotalPages, cursor)
    cursor += (currTotalPages - lastTotalPages)
    cursor > currTotalPages && (cursor = currTotalPages)
    lastTotalPages = currTotalPages
    debug('新的光标值：', cursor)
    writeCursorData(cursor, lastTotalPages)
  }
  async function loop () {
    const dirtPage = cursor
    if (dirtPage < 1) return
    try {
      const galleries = await fetchGalleries(dirtPage)
      if (lastTotalPages < galleries.num_pages) {
        debug('在获取本子数据时，新的总页数大于最后一次总页，更新光标')
        cursor += (galleries.num_pages - lastTotalPages)
        cursor > galleries.num_pages && (cursor = galleries.num_pages)
        lastTotalPages = galleries.num_pages
        cursor++
      }
      debug('开始同步当前光标 %d 页的本子数据集...', dirtPage)
      for (const gallery of galleries.result) {
        await saveBook(gallery)
      }
      cursor--
    } catch (e) {
      console.error('循环体内部出错：', e)
      writeCursorData(cursor, lastTotalPages)
      return
    }
    await loop()
  }
  debug('开始循环体...')
  try {
    looping = true
    await loop()
  } finally {
    debug('循环体完成')
    if (cursor <= 0) cursor = 1
    writeCursorData(cursor, lastTotalPages)
    looping = false
  }
}

function exitHandler () {
  debug('进程退出，保存状态...')
  writeCursorData(cursor, lastTotalPages)
}

process.once('exit', (code) => debug('退出码：', code))
process.once('SIGINT', exitHandler)
process.once('SIGQUIT', exitHandler)
process.once('SIGTERM', exitHandler)
process.once('SIGUSR1', exitHandler)
process.once('SIGUSR2', exitHandler)

const CRON_EXPRESSION = process.env.CRON_EXPRESSION
if (!CRON_EXPRESSION || !cron.validate(CRON_EXPRESSION)) {
  debug('无效的定时表达式：', CRON_EXPRESSION)
  process.exit(1)
}

cron.schedule(CRON_EXPRESSION, run, {
  scheduled: true,
  timezone: 'Asia/Shanghai'
})

run()
