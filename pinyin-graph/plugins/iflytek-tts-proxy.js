/**
 * Vite dev server plugin: 讯飞 TTS 代理
 *
 * 仅在开发环境使用，避免将 API_SECRET 暴露到前端。
 * 生产环境应使用独立后端服务处理讯飞鉴权。
 */
import { createHmac } from 'crypto'
import WebSocket from 'ws'

const TTS_HOST = 'tts-api.xfyun.cn'
const TTS_PATH = '/v2/tts'
const API_URL = `wss://${TTS_HOST}${TTS_PATH}`

function buildAuthUrl({ appId, apiKey, apiSecret }) {
  const date = new Date().toUTCString()
  const signatureOrigin = `host: ${TTS_HOST}\ndate: ${date}\nGET ${TTS_PATH} HTTP/1.1`
  const signature = createHmac('sha256', apiSecret).update(signatureOrigin).digest('base64')
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = Buffer.from(authorizationOrigin).toString('base64')

  const url = new URL(API_URL)
  url.searchParams.set('authorization', authorization)
  url.searchParams.set('date', date)
  url.searchParams.set('host', TTS_HOST)
  return url.toString()
}

export default function iflytekTtsProxy(env) {
  const appId = env.IFLYTEK_APP_ID
  const apiKey = env.IFLYTEK_API_KEY
  const apiSecret = env.IFLYTEK_API_SECRET
  const enabled = !!(appId && apiKey && apiSecret)

  return {
    name: 'iflytek-tts-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res, next) => {
        if (!enabled) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'iFlytek TTS not configured' }))
          return
        }

        const url = new URL(req.url, `http://${req.headers.host}`)
        const text = url.searchParams.get('text') || ''
        if (!text) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing text param' }))
          return
        }

        const authUrl = buildAuthUrl({ appId, apiKey, apiSecret })
        const ws = new WebSocket(authUrl)

        const chunks = []
        let errorMsg = null

        ws.on('open', () => {
          const frame = {
            common: { app_id: appId },
            business: {
              aue: 'lame', // mp3
              sfl: 1,      // mp3 sample rate flag
              auf: 'audio/L16;rate=16000',
              vcn: 'xiaoyan',
              speed: 30,
              volume: 50,
              pitch: 50,
              bgs: 0,
              tte: 'UTF8',
            },
            data: {
              status: 2,
              text: Buffer.from(text).toString('base64'),
            },
          }
          ws.send(JSON.stringify(frame))
        })

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString())
          if (message.code !== 0) {
            errorMsg = message.message || `iFlytek error ${message.code}`
            return
          }
          if (message.data && message.data.audio) {
            chunks.push(Buffer.from(message.data.audio, 'base64'))
          }
          if (message.data && message.data.status === 2) {
            ws.close()
          }
        })

        ws.on('error', (err) => {
          errorMsg = err.message
          ws.close()
        })

        ws.on('close', () => {
          if (errorMsg) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: errorMsg }))
            return
          }
          const audio = Buffer.concat(chunks)
          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('Content-Length', audio.length)
          res.end(audio)
        })
      })
    },
  }
}
