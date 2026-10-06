-- 批量上传支持指定职位：非空时覆盖 AI 识别的候选人职位
ALTER TABLE talent_parse_tasks ADD COLUMN override_position TEXT;
