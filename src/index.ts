import './dotenv.resolve'
import database from './database'

database().then(() => require('./main')).catch((err) => {
  console.error('服务开启失败:', err)
  process.exit(1)
})
