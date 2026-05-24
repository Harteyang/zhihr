import { register, matchRoute, jsonResponse, getCorsHeaders, debugLog } from './utils/router.js'

import * as auth from './modules/auth.js'
import * as reviews from './modules/reviews.js'

register(auth)
register(reviews)

async function handleRequest(request, env) {
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
    return await route.handler(request, env, corsHeaders, route.params)
  }

  debugLog('Request', `404 Not found: ${path}`)
  return jsonResponse({ success: false, message: 'Not found' }, 404, corsHeaders)
}

export default {
  async fetch(request, env) {
    return await handleRequest(request, env)
  }
}
