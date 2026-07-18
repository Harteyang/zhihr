-- 面试评价与候选人分享链接表
-- 用于支撑候选人详情页的"面试评价"和"跟进记录"tab，以及独立的候选人评价分享页

-- 面试评价表（支持内部填写和分享链接填写两种来源）
CREATE TABLE IF NOT EXISTS talent_interview_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    evaluator_name TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'internal',
    share_link_id INTEGER,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talent_evaluations_candidate ON talent_interview_evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_evaluations_share_link ON talent_interview_evaluations(share_link_id);
CREATE INDEX IF NOT EXISTS idx_talent_evaluations_created ON talent_interview_evaluations(created_at);

-- 候选人分享链接表（永久有效，token 唯一）
CREATE TABLE IF NOT EXISTS talent_share_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    evaluator_name TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talent_share_links_candidate ON talent_share_links(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_share_links_token ON talent_share_links(token);
