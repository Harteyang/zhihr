import { register, matchRoute, jsonResponse, getCorsHeaders, debugLog } from './utils/router.js'

import * as auth from './modules/auth.js'
import * as reviews from './modules/reviews.js'
import * as miaodu from './modules/miaodu.js'
import * as talent from './modules/talent/index.js'
import * as talentAuth from './modules/talent_auth.js'
import * as tasks from './modules/tasks.js'

register(auth)
register(reviews)
register(miaodu)
register(talent)
register(talentAuth)
register(tasks)

async function handleRequest(request, env, ctx) {
  debugLog('Request', `${request.method} ${request.url}`)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: getCorsHeaders(request, env)
    })
  }

  const corsHeaders = getCorsHeaders(request, env)
  const url = new URL(request.url)
  let path = url.pathname
  const method = request.method

  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1)
  }

  if (path === '/api/health') {
    return jsonResponse({ success: true, message: 'API is running' }, 200, corsHeaders)
  }

  const route = matchRoute(method, path)
  if (route) {
    debugLog('Router', `Matched ${method} ${path}`)
    return await route.handler(request, env, corsHeaders, route.params, ctx)
  }

  debugLog('Request', `404 Not found: ${path}`)
  return jsonResponse({ success: false, message: 'Not found' }, 404, corsHeaders)
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx)
    } catch (err) {
      console.error('Unhandled error:', err)
      const corsHeaders = getCorsHeaders(request, env)
      return jsonResponse({ success: false, message: '服务器内部错误，请稍后重试' }, 500, corsHeaders)
    }
  }
}
