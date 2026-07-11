-- 人才库账号管理：扩展 users 表
-- 注意：ALTER TABLE ADD COLUMN 不支持 IF NOT EXISTS，每条只能执行一次
-- 如果列已存在会报错，忽略即可

ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at TEXT;
