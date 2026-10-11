CREATE SCHEMA IF NOT EXISTS sumabura;


-- ファイター管理
DROP TABLE IF EXISTS sumabura.characters;
CREATE TABLE sumabura.characters (
    id INTEGER PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    nickname VARCHAR(20) NOT NULL,
    note TEXT
);
COMMENT ON TABLE sumabura.characters IS 'ファイター管理';
COMMENT ON COLUMN sumabura.characters.id IS 'ファイターID';
COMMENT ON COLUMN sumabura.characters.name IS 'ファイター名';
COMMENT ON COLUMN sumabura.characters.nickname IS '略称名';
COMMENT ON COLUMN sumabura.characters.note IS '説明';


-- 使用キャラ管理
DROP TABLE IF EXISTS sumabura.user_characters;
CREATE TABLE sumabura.user_characters (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);
COMMENT ON TABLE sumabura.user_characters IS '使用キャラ管理';
COMMENT ON COLUMN sumabura.user_characters.id IS 'ID';
COMMENT ON COLUMN sumabura.user_characters.character_id IS 'ファイターID';
COMMENT ON COLUMN sumabura.user_characters.is_deleted IS '削除フラグ';


-- 対策メモ
DROP TABLE IF EXISTS sumabura.strategy_notes;
CREATE TABLE sumabura.strategy_notes (
    id SERIAL PRIMARY KEY,
    my_character_id INTEGER NOT NULL,
    target_character_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    youtube_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sumabura.strategy_notes IS '対策メモ';
COMMENT ON COLUMN sumabura.strategy_notes.id IS 'ID';
COMMENT ON COLUMN sumabura.strategy_notes.my_character_id IS '自キャラID';
COMMENT ON COLUMN sumabura.strategy_notes.target_character_id IS '対策対象キャラID';
COMMENT ON COLUMN sumabura.strategy_notes.content IS '対策内容';
COMMENT ON COLUMN sumabura.strategy_notes.youtube_url IS 'YouTube URL';
COMMENT ON COLUMN sumabura.strategy_notes.updated_at IS '最終更新日時';
