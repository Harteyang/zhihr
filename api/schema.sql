-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT '待办',
    priority TEXT DEFAULT '中',
    due_date TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- 复盘记录表
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    review_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户配置表
CREATE TABLE IF NOT EXISTS user_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    config TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 反馈需求表（公开反馈，无需用户认证）
CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '匿名',
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON reviews(user_id, review_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);

-- ========= 人才库管理系统 =========

-- 候选人表
CREATE TABLE IF NOT EXISTS talent_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    position TEXT,
    skills TEXT,
    education TEXT,
    experience_years INTEGER,
    status TEXT DEFAULT 'pending',
    source TEXT,
    summary TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 工作经历表
CREATE TABLE IF NOT EXISTS talent_work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

-- 附件元数据表（文件原件存 R2）
CREATE TABLE IF NOT EXISTS talent_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    file_size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talent_candidates_status ON talent_candidates(status);
CREATE INDEX IF NOT EXISTS idx_talent_candidates_position ON talent_candidates(position);
CREATE INDEX IF NOT EXISTS idx_talent_candidates_name ON talent_candidates(name);
CREATE INDEX IF NOT EXISTS idx_talent_candidates_created_by ON talent_candidates(created_by);
CREATE INDEX IF NOT EXISTS idx_talent_work_exp_candidate ON talent_work_experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_attachments_candidate ON talent_attachments(candidate_id);

-- ========= 账号管理与权限 =========

-- 用户-岗位权限表（普通用户只能看分配岗位的候选人）
CREATE TABLE IF NOT EXISTS talent_user_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    position TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, position)
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS talent_operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    username TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_talent_user_positions_user ON talent_user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_operation_logs_user ON talent_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_operation_logs_action ON talent_operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_talent_operation_logs_created ON talent_operation_logs(created_at);

-- ========= 批量简历解析任务队列 =========

CREATE TABLE IF NOT EXISTS talent_parse_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    oss_key TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    parsed_data TEXT,
    candidate_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_talent_parse_tasks_batch ON talent_parse_tasks(batch_id);
CREATE INDEX IF NOT EXISTS idx_talent_parse_tasks_user ON talent_parse_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_parse_tasks_status ON talent_parse_tasks(status);
CREATE INDEX IF NOT EXISTS idx_talent_parse_tasks_created ON talent_parse_tasks(created_at);

-- ========= 面试评价与分享链接 =========

-- 面试评价表（支持内部填写和分享链接填写两种来源）
CREATE TABLE IF NOT EXISTS talent_interview_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    evaluator_name TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'internal', -- 'internal' 内部填写 / 'share' 分享链接填写
    share_link_id INTEGER, -- 关联分享链接 ID（source='share' 时填充）
    created_by TEXT, -- 内部评价记录提交人 user_id
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
    evaluator_name TEXT NOT NULL, -- 写死的评价人信息
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talent_share_links_candidate ON talent_share_links(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_share_links_token ON talent_share_links(token);

