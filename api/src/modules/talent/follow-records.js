import { jsonResponse, maskError, requireAuth } from '../../utils/router.js'
import { checkPositionPermission } from './permissions.js'

/**
 * 跟进记录模块：聚合候选人所有时间线事件
 * - 候选人创建时间
 * - 候选人最近更新时间
 * - 状态变更记录
 * - 评价提交/修改记录
 * - 分享链接创建记录
 * - 其他 operation_logs 中以该候选人为资源的记录
 */

const STATUS_LABELS = {
  pending: '待联系',
  contacted: '已联系',
  interviewing: '面试中',
  offered: '已录用',
  rejected: '已拒绝'
}

const ACTION_LABELS = {
  create_candidate: '创建候选人',
  update_candidate: '更新候选人信息',
  update_candidate_status: '更新候选人状态',
  delete_candidate: '删除候选人',
  upload_attachment: '上传简历附件',
  create_evaluation: '提交面试评价',
  update_evaluation: '修改面试评价',
  delete_evaluation: '删除面试评价',
  create_share_link: '创建分享链接',
  delete_share_link: '删除分享链接',
  submit_share_evaluation: '提交分享评价',
  update_share_evaluation: '修改分享评价'
}

function describeAction(action, detail) {
  const label = ACTION_LABELS[action] || action
  // 对状态变更补充新旧状态描述
  if (action === 'update_candidate_status' && detail) {
    const from = detail.from ? (STATUS_LABELS[detail.from] || detail.from) : '?'
    const to = detail.to ? (STATUS_LABELS[detail.to] || detail.to) : '?'
    return `${label}：${from} → ${to}`
  }
  if (action === 'create_evaluation' && detail?.evaluator_name) {
    return `${label}（评价人：${detail.evaluator_name}）`
  }
  if (action === 'update_evaluation' && detail?.evaluator_name) {
    return `${label}（评价人：${detail.evaluator_name}）`
  }
  if (action === 'create_share_link' && detail?.evaluator_name) {
    return `${label}（评价人：${detail.evaluator_name}）`
  }
  if (action === 'submit_share_evaluation' && detail?.evaluator_name) {
    return `${label}（评价人：${detail.evaluator_name}）`
  }
  if (action === 'update_share_evaluation' && detail?.evaluator_name) {
    return `${label}（评价人：${detail.evaluator_name}）`
  }
  if (action === 'upload_attachment' && detail?.file_name) {
    return `${label}：${detail.file_name}`
  }
  return label
}

async function listFollowRecords(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare(
      'SELECT id, name, position, created_by, created_at, updated_at, status FROM talent_candidates WHERE id = ?'
    ).bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权查看该候选人' }, 403, corsHeaders)
    }

    // 1. 评价创建/修改时间直接来自 talent_interview_evaluations 表
    const evaluations = await env.DB.prepare(
      `SELECT id, evaluator_name, content, source, created_at, updated_at
       FROM talent_interview_evaluations
       WHERE candidate_id = ?
       ORDER BY created_at ASC`
    ).bind(params.id).all()

    // 2. 操作日志：
    //    - 直接关联候选人的日志（resource_type='candidate' AND resource_id=params.id）
    //    - 间接关联的日志（resource_type IN evaluation/share_link/attachment）需在 JS 中解析 detail.candidate_id 过滤
    //    避免使用 LIKE 'candidate_id":1%' 模式，否则 candidate_id=1 会误匹配 11、100 等
    const candidateLogs = await env.DB.prepare(
      `SELECT id, user_id, username, action, resource_type, resource_id, detail, ip_address, created_at
       FROM talent_operation_logs
       WHERE resource_type = 'candidate' AND resource_id = ?
       ORDER BY created_at ASC`
    ).bind(String(params.id)).all()

    const relatedLogs = await env.DB.prepare(
      `SELECT id, user_id, username, action, resource_type, resource_id, detail, ip_address, created_at
       FROM talent_operation_logs
       WHERE resource_type IN ('evaluation', 'share_link', 'attachment')
       ORDER BY created_at DESC
       LIMIT 500`
    ).all()

    // 在 JS 中过滤出 detail.candidate_id === Number(params.id) 的日志
    const filteredRelated = relatedLogs.results.filter(log => {
      if (!log.detail) return false
      try {
        const detail = JSON.parse(log.detail)
        return Number(detail.candidate_id) === Number(params.id)
      } catch {
        return false
      }
    })

    const allLogs = [...candidateLogs.results, ...filteredRelated]
    // 按时间升序排序
    allLogs.sort((a, b) => {
      const ta = a.created_at || ''
      const tb = b.created_at || ''
      if (ta < tb) return -1
      if (ta > tb) return 1
      return 0
    })

    const events = []

    // 简历创建事件
    events.push({
      type: 'candidate_created',
      title: '简历创建',
      description: `创建候选人档案${candidate.name ? `（${candidate.name}）` : ''}`,
      operator: '',
      time: candidate.created_at,
      sort_key: candidate.created_at
    })

    // 操作日志事件
    for (const log of allLogs) {
      // 跳过创建候选人日志，已用 candidate_created 事件表示
      if (log.action === 'create_candidate') continue
      let detail = null
      try { detail = log.detail ? JSON.parse(log.detail) : null } catch { detail = null }
      // 状态变更日志补充 from/to
      if (log.action === 'update_candidate_status' && detail && !detail.from && !detail.to) {
        if (detail.status) detail.to = detail.status
      }
      events.push({
        type: log.action,
        title: describeAction(log.action, detail),
        description: '',
        operator: log.username || (log.user_id ? `用户#${log.user_id}` : '系统'),
        time: log.created_at,
        sort_key: log.created_at
      })
    }

    // 评价提交/修改事件（来自 evaluations 表，作为日志缺失时的兜底）
    // 注意：createEvaluation/updateEvaluation/submitShareEvaluation/updateShareEvaluation
    // 都已写入 operation_logs，正常情况下日志已覆盖。这里仅在日志缺失时补充，
    // 用 evaluator_name 做去重，避免时间戳偏差（日志与评价表的 created_at 可能差 1 秒）导致重复
    const loggedEvaluators = new Set(
      allLogs
        .filter(l => ['create_evaluation', 'submit_share_evaluation', 'update_evaluation', 'update_share_evaluation'].includes(l.action))
        .map(l => {
          try { return JSON.parse(l.detail || '{}').evaluator_name } catch { return null }
        })
        .filter(Boolean)
    )

    for (const ev of evaluations.results) {
      // 该评价人已有提交日志，跳过兜底事件
      if (loggedEvaluators.has(ev.evaluator_name)) continue
      events.push({
        type: 'evaluation_submitted',
        title: `提交面试评价（评价人：${ev.evaluator_name}）`,
        description: '',
        operator: ev.evaluator_name,
        time: ev.created_at,
        sort_key: ev.created_at
      })
    }

    // 简历最近更新事件（仅在更新时间晚于创建时间时展示）
    if (candidate.updated_at && candidate.updated_at !== candidate.created_at) {
      events.push({
        type: 'candidate_updated',
        title: '简历最近更新',
        description: `档案信息更新`,
        operator: '',
        time: candidate.updated_at,
        sort_key: candidate.updated_at
      })
    }

    // 按时间升序排列
    events.sort((a, b) => {
      const ta = a.sort_key || ''
      const tb = b.sort_key || ''
      if (ta < tb) return -1
      if (ta > tb) return 1
      return 0
    })

    // 同时返回候选人核心时间信息（便于顶部展示）
    return jsonResponse({
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          status: candidate.status,
          status_label: STATUS_LABELS[candidate.status] || candidate.status,
          created_at: candidate.created_at,
          updated_at: candidate.updated_at
        },
        events: events.map(e => ({
          type: e.type,
          title: e.title,
          description: e.description,
          operator: e.operator,
          time: e.time
        }))
      }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/candidates/:id/follow-records', handler: listFollowRecords }
]
