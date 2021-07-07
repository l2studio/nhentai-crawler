import mongoose from 'mongoose'

const debug = require('debug')('lgou2w:nhentai-crawler:database')

export default async function database () {
  const pkgName = process.env.npm_package_name
  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASS,
    DB_NAME,
    DB_OPTS
  } = process.env

  const uri = (!DB_USER || !DB_PASS
    ? `mongodb://${DB_HOST}:${DB_PORT || '27017'}/${DB_NAME || pkgName}`
    : `mongodb://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT || '27017'}/${DB_NAME || pkgName}`) + DB_OPTS

  debug('MongoDB 连接地址:', uri)

  try {
    await mongoose.connect(uri, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useCreateIndex: true
    })
    debug('MongoDB 已连接')
  } catch (e) {
    debug('连接到 MongoDB 数据库时错误:', e)
    process.exit(-1)
  }
}
