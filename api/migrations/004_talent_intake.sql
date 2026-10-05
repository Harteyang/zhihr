-- 面试登记：候选人登记信息主表（与候选人 1:1）
CREATE TABLE IF NOT EXISTS talent_intake_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL UNIQUE,
    -- 基础信息
    gender TEXT,
    birth_month TEXT,
    ethnicity TEXT,
    marital_status TEXT,
    hometown TEXT,
    household_type TEXT,
    address TEXT,
    health_status TEXT,
    height TEXT,
    political_status TEXT,
    -- 证件
    id_number TEXT,
    id_expiry_start TEXT,
    id_expiry_end TEXT,
    wechat TEXT,
    -- 求职信息
    current_salary TEXT,
    expected_salary_min TEXT,
    expected_salary_max TEXT,
    onboard_time TEXT,
    has_referral TEXT,
    referral_text TEXT,
    -- 教育信息
    school TEXT,
    major TEXT,
    graduation_start TEXT,
    graduation_end TEXT,
    is_unified TEXT,
    certificates TEXT,
    -- 合规信息
    non_compete TEXT,
    non_compete_note TEXT,
    arbitration_record TEXT,
    -- 财务信息
    bank_card TEXT,
    bank_name TEXT,
    -- 承诺
    truth_confirmed INTEGER DEFAULT 0,
    filled_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 面试登记：联系人表（家人/紧急联系人，1:N）
CREATE TABLE IF NOT EXISTS talent_intake_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    contact_type TEXT NOT NULL DEFAULT 'family',
    name TEXT,
    relation TEXT,
    gender TEXT,
    birth_month TEXT,
    phone TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intake_contacts_candidate ON talent_intake_contacts(candidate_id);

-- 附件用途（区分简历/身份证/证书/照片/签名等）
ALTER TABLE talent_attachments ADD COLUMN kind TEXT DEFAULT 'resume';
