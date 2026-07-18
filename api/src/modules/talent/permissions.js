import { getUserPositions } from '../../utils/router.js'

async function checkPositionPermission(env, user, candidatePosition, createdBy = null) {
  if (user.role === 'admin') return true
  const allowedPositions = await getUserPositions(env, user.userId, user.role)
  if (allowedPositions === null) return true
  if (candidatePosition === null || candidatePosition === undefined) {
    return createdBy === user.userId
  }
  return allowedPositions.includes(candidatePosition)
}

export { checkPositionPermission }