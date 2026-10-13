CREATE TABLE IF NOT EXISTS comments (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	slug       TEXT    NOT NULL,
	name       TEXT    NOT NULL,
	email      TEXT,                -- optional, never returned by GET /api/comments
	body       TEXT    NOT NULL,
	created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug, created_at DESC);
