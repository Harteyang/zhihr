-- 迁移：候选人状态体系重构 + 简历分享链接表
-- 执行方式: npx wrangler d1 execute zhihr_db --remote --file=migrations/002_status_refactor_and_resume_shares.sql

-- 1. 旧状态 → 新状态映射
-- 旧: pending(待联系), contacted(已联系), interviewing(面试中), offered(已录用), rejected(已拒绝)
-- 新: to_recommend(待推荐), resume_passed(简历筛选通过), interview_scheduled(已安排面试),
--     interview_passed(面试通过), offer_discussing(offer沟通), offer_rejected(拒绝offer),
--     hired(已录用), screening_failed(筛选不通过)
UPDATE talent_candidates SET status = 'to_recommend' WHERE status = 'pending';
UPDATE talent_candidates SET status = 'to_recommend' WHERE status = 'contacted';
UPDATE talent_candidates SET status = 'interview_scheduled' WHERE status = 'interviewing';
UPDATE talent_candidates SET status = 'hired' WHERE status = 'offered';
UPDATE talent_candidates SET status = 'screening_failed' WHERE status = 'rejected';

-- 2. 简历分享链接表（用于将简历分享给面试官，面试官可在分享页点击操作按钮）
CREATE TABLE IF NOT EXISTS talent_resume_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talent_resume_shares_candidate ON talent_resume_shares(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_resume_shares_token ON talent_resume_shares(token);
