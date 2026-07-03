-- 妙读 (MiaoDu) 系统数据库表结构
-- 与 zhihr_db 共用数据库，添加独立的妙读表

CREATE TABLE IF NOT EXISTS miaodu_books (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL UNIQUE,
    author          TEXT,
    isbn            TEXT,
    douban_rate     REAL,
    description     TEXT,
    cover_url       TEXT,
    baidu_pan_url   TEXT,
    baidu_pan_code  TEXT,
    mlook_book_id   INTEGER,
    mlook_link      TEXT,
    status          TEXT DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_miaodu_books_title ON miaodu_books(title);
CREATE INDEX IF NOT EXISTS idx_miaodu_books_author ON miaodu_books(author);

CREATE TABLE IF NOT EXISTS miaodu_knowledge_points (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id         INTEGER NOT NULL,
    chapter         TEXT NOT NULL,
    level           INTEGER DEFAULT 1,
    title           TEXT NOT NULL,
    content         TEXT,
    parent_id       INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES miaodu_books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_miaodu_knowledge_book ON miaodu_knowledge_points(book_id);

CREATE TABLE IF NOT EXISTS miaodu_submissions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    type            TEXT NOT NULL,
    search_query    TEXT NOT NULL,
    status          TEXT DEFAULT 'queued',
    mlook_found     BOOLEAN DEFAULT 0,
    mlook_link      TEXT,
    error_message   TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_miaodu_submissions_status ON miaodu_submissions(status);
