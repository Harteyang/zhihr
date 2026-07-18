import { debugLog, jsonResponse, maskError, requireAuth, requireAdmin, logOperation, getClientIp, parsePagination } from '../../utils/router.js'
import { OSSClient } from '../../utils/oss.js'
import { parseFile } from '../../modules/talent_parsers.js'
import { callAIWithFallback } from './ai-parser.js'
import { getMimeType, createCandidateFromParse } from './candidates.js'

const PARSE_TASK_RETENTION_DAYS = 30
const PARSE_TASK_TIMEOUT_MINUTES = 5
const MAX_CONCURRENT_TASKS = 2

async function createBatchParseTasks(request, env, corsHeaders, params, ctx) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const { files } = body
    if (!Array.isArray(files) || files.length === 0) {
      return jsonResponse({ success: false, message: 'files 为必填且不能为空' }, 400, corsHeaders)
    }
    if (files.length > 10) {
      return jsonResponse({ success: false, message: `单次最多上传 10 个文件` }, 400, corsHeaders)
    }

    for (const f of files) {
      if (!f.ossKey || !f.fileName) {
        return jsonResponse({ success: false, message: '每个文件需包含 ossKey 和 fileName' }, 400, corsHeaders)
      }
      const ext = f.fileName.substring(f.fileName.lastIndexOf('.')).toLowerCase()
      if (!['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
        return jsonResponse({ success: false, message: `不支持的文件类型: ${ext}` }, 400, corsHeaders)
      }
    }

    const batchId = crypto.randomUUID()

    const stmts = files.map(f => {
      const ext = f.fileName.substring(f.fileName.lastIndexOf('.')).toLowerCase().replace('.', '')
      return env.DB.prepare(
        `INSERT INTO talent_parse_tasks (batch_id, user_id, file_name, file_type, file_size, oss_key, status, progress)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`
      ).bind(batchId, user.userId, f.fileName, ext, f.fileSize || null, f.ossKey)
    })
    await env.DB.batch(stmts)

    await logOperation(env, user, 'create_batch_parse', 'parse_batch', batchId, { file_count: files.length }, getClientIp(request))

    try {
      const runningCount = (await env.DB.prepare(
        `SELECT COUNT(*) as count FROM talent_parse_tasks WHERE status = 'parsing'`
      ).first()).count || 0

      if (runningCount < MAX_CONCURRENT_TASKS) {
        const slots = MAX_CONCURRENT_TASKS - runningCount
        const pendingTasks = await env.DB.prepare(
          `SELECT id, batch_id, user_id, file_name, file_type, file_size, oss_key FROM talent_parse_tasks WHERE status = 'pending' ORDER BY created_at LIMIT ?`
        ).bind(slots).all()

        for (const nextTask of (pendingTasks.results || [])) {
          const claim = await env.DB.prepare(
            `UPDATE talent_parse_tasks SET status = 'parsing', progress = 5, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
          ).bind(nextTask.id).run()
          if (claim.meta.changes > 0) {
            const taskUserObj = { userId: user.userId, username: user.username, role: user.role }
            const processPromise = (async () => {
              try {
                await processSingleParseTask(env, nextTask, taskUserObj)
              } catch (parseErr) {
                await env.DB.prepare(
                  `UPDATE talent_parse_tasks SET status = 'failed', error_message = ?, progress = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
                ).bind(parseErr.message || '解析失败', nextTask.id).run()
                debugLog('ParseQueue', `Task ${nextTask.id} failed:`, parseErr.message)
              }
            })()
            if (ctx && typeof ctx.waitUntil === 'function') {
              ctx.waitUntil(processPromise)
            }
          }
        }
      }
    } catch (triggerErr) {
      debugLog('ParseQueue', 'Trigger error (non-fatal):', triggerErr.message)
    }

    return jsonResponse({ success: true, data: { batchId, taskCount: files.length } }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function processSingleParseTask(env, task, user) {
  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    throw new Error('文件存储服务未配置（OSS）')
  }

  await env.DB.prepare(
    `UPDATE talent_parse_tasks SET progress = 10, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(task.id).run()

  const ossRes = await oss.get(task.oss_key)
  if (!ossRes.ok) {
    throw new Error(`OSS 下载失败 (${ossRes.status})`)
  }
  const arrayBuffer = await ossRes.arrayBuffer()

  await env.DB.prepare(
    `UPDATE talent_parse_tasks SET progress = 30, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(task.id).run()

  const parsed = await parseFile(task.file_name, arrayBuffer)
  const resumeText = parsed.raw_text || ''

  if (!resumeText || resumeText.trim().length < 10) {
    throw new Error('无法从文件中提取足够文本，请确认文件内容是否正常')
  }

  await env.DB.prepare(
    `UPDATE talent_parse_tasks SET progress = 50, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(task.id).run()

  const aiResult = await callAIWithFallback(resumeText, env)

  await env.DB.prepare(
    `UPDATE talent_parse_tasks SET progress = 80, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(task.id).run()

  if (!aiResult.name || !String(aiResult.name).trim()) {
    throw new Error('AI 解析结果缺少姓名字段')
  }
  if (!aiResult.position || !String(aiResult.position).trim()) {
    throw new Error('AI 解析结果缺少岗位字段')
  }

  const { candidateId, parsedData } = await createCandidateFromParse(env, aiResult, task, user.userId)

  await env.DB.prepare(
    `UPDATE talent_parse_tasks SET status = 'completed', progress = 100, parsed_data = ?, candidate_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(JSON.stringify(aiResult), candidateId, task.id).run()

  return { candidateId, parsedData }
}

async function getBatchStatus(request, env, corsHeaders, params, ctx) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const { batchId } = params

    const fetchTasks = () => env.DB.prepare(
      `SELECT id, file_name, file_type, file_size, status, progress, error_message, candidate_id, created_at, updated_at
       FROM talent_parse_tasks WHERE batch_id = ? AND user_id = ? ORDER BY id`
    ).bind(batchId, user.userId).all()

    let tasks = await fetchTasks()

    if (!tasks.results || tasks.results.length === 0) {
      return jsonResponse({ success: false, message: '批次不存在或无权查看' }, 404, corsHeaders)
    }

    const now = new Date()

    const timeoutTasks = tasks.results.filter(t => {
      if (t.status !== 'parsing') return false
      const updatedAt = new Date(t.updated_at.replace(' ', 'T'))
      const elapsedMinutes = (now - updatedAt) / (1000 * 60)
      return elapsedMinutes > PARSE_TASK_TIMEOUT_MINUTES
    })

    if (timeoutTasks.length > 0) {
      for (const task of timeoutTasks) {
        await env.DB.prepare(
          `UPDATE talent_parse_tasks SET status = 'failed', error_message = ?, progress = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'parsing'`
        ).bind(`任务处理超时（超过 ${PARSE_TASK_TIMEOUT_MINUTES} 分钟），请点击"重启解析"重新处理`, task.id).run()
        debugLog('ParseTimeout', `Task ${task.id} (${task.file_name}) marked as failed due to timeout`)
        await logOperation(env, user, 'task_timeout', 'parse_task', task.id, { reason: 'timeout', timeoutMinutes: PARSE_TASK_TIMEOUT_MINUTES }, getClientIp(request))
      }
    }

    try {
      const runningCount = (await env.DB.prepare(
        `SELECT COUNT(*) as count FROM talent_parse_tasks WHERE status = 'parsing'`
      ).first()).count || 0
      debugLog('ParseQueue', `Current parsing tasks: ${runningCount}/${MAX_CONCURRENT_TASKS}`)

      if (runningCount < MAX_CONCURRENT_TASKS) {
        const slots = MAX_CONCURRENT_TASKS - runningCount
        const pendingTasks = await env.DB.prepare(
          `SELECT id, batch_id, user_id, file_name, file_type, file_size, oss_key FROM talent_parse_tasks WHERE status = 'pending' ORDER BY created_at LIMIT ?`
        ).bind(slots).all()

        for (const nextTask of (pendingTasks.results || [])) {
          const claim = await env.DB.prepare(
            `UPDATE talent_parse_tasks SET status = 'parsing', progress = 5, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
          ).bind(nextTask.id).run()

          if (claim.meta.changes > 0) {
            const taskUser = await env.DB.prepare(
              'SELECT id, username, role FROM users WHERE id = ?'
            ).bind(nextTask.user_id).first()

            if (!taskUser) {
              await env.DB.prepare(
                `UPDATE talent_parse_tasks SET status = 'failed', error_message = ?, progress = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
              ).bind('任务所属用户已被删除', nextTask.id).run()
              debugLog('ParseQueue', `Task ${nextTask.id} skipped: user ${nextTask.user_id} deleted`)
            } else {
              const taskUserObj = { userId: taskUser.id, username: taskUser.username, role: taskUser.role }

              const processPromise = (async () => {
                try {
                  await processSingleParseTask(env, nextTask, taskUserObj)
                } catch (parseErr) {
                  await env.DB.prepare(
                    `UPDATE talent_parse_tasks SET status = 'failed', error_message = ?, progress = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
                  ).bind(parseErr.message || '解析失败', nextTask.id).run()
                  debugLog('ParseQueue', `Task ${nextTask.id} failed:`, parseErr.message)
                }
              })()

              if (ctx && typeof ctx.waitUntil === 'function') {
                ctx.waitUntil(processPromise)
              } else {
                await processPromise
              }
            }
          }
        }
      }
    } catch (procErr) {
      debugLog('ParseQueue', 'Processing error (non-fatal):', procErr.message)
    }

    tasks = await fetchTasks()

    const taskList = tasks.results
    const total = taskList.length
    const completed = taskList.filter(t => t.status === 'completed').length
    const failed = taskList.filter(t => t.status === 'failed').length
    const parsing = taskList.filter(t => t.status === 'parsing').length
    const pending = taskList.filter(t => t.status === 'pending').length
    const overallProgress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0
    const allDone = completed + failed === total

    return jsonResponse({
      success: true,
      data: {
        batchId,
        tasks: taskList,
        total,
        completed,
        failed,
        parsing,
        pending,
        overallProgress,
        allDone
      }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function getParseTaskHistory(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    const cutoffDate = new Date(Date.now() - PARSE_TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const cutoffStr = cutoffDate.toISOString().replace('T', ' ').substring(0, 19)
    const where = `WHERE user_id = ? AND created_at >= ?`
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM talent_parse_tasks ${where}`
    ).bind(user.userId, cutoffStr).first()
    const total = countRow.total

    const rows = await env.DB.prepare(
      `SELECT id, batch_id, file_name, file_type, file_size, status, progress, error_message, candidate_id, created_at, updated_at
       FROM talent_parse_tasks ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(user.userId, cutoffStr, pageSize, offset).all()

    const batches = {}
    for (const row of rows.results) {
      if (!batches[row.batch_id]) {
        batches[row.batch_id] = { batchId: row.batch_id, tasks: [], createdAt: row.created_at }
      }
      batches[row.batch_id].tasks.push(row)
    }

    return jsonResponse({
      success: true,
      data: { batches: Object.values(batches), total, page, pageSize }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function retryParseTask(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const { taskId } = params
    const task = await env.DB.prepare(
      'SELECT id, user_id, file_name, file_type, file_size, oss_key, status, updated_at FROM talent_parse_tasks WHERE id = ? AND user_id = ?'
    ).bind(taskId, user.userId).first()

    if (!task) {
      return jsonResponse({ success: false, message: '任务不存在或无权操作' }, 404, corsHeaders)
    }

    const allowedStatuses = ['failed', 'parsing', 'pending']
    if (!allowedStatuses.includes(task.status)) {
      return jsonResponse({ success: false, message: `任务状态为"${task.status}"，不支持重启。仅支持 failed/parsing/pending 状态的任务。` }, 400, corsHeaders)
    }

    const previousStatus = task.status
    await env.DB.prepare(
      `UPDATE talent_parse_tasks SET status = 'pending', progress = 0, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(taskId).run()

    await logOperation(env, user, 'task_retry', 'parse_task', taskId, { previousStatus, fileName: task.file_name }, getClientIp(request))
    debugLog('ParseRetry', `Task ${taskId} (${task.file_name}) restarted from ${previousStatus} to pending`)

    const message = previousStatus === 'parsing' ? '已激活任务，重新加入解析队列' : '已重新加入解析队列'
    return jsonResponse({ success: true, message }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'POST', path: '/api/talent/parse-tasks/batch', handler: createBatchParseTasks },
  { method: 'GET', path: '/api/talent/parse-tasks/batch/:batchId', handler: getBatchStatus },
  { method: 'GET', path: '/api/talent/parse-tasks/history', handler: getParseTaskHistory },
  { method: 'POST', path: '/api/talent/parse-tasks/:taskId/retry', handler: retryParseTask },
]