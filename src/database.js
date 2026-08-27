const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.RADIOCORE_DB || path.join(DATA_DIR, 'radiocore.db');

function getDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS Catalogo (
      track_id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      artista TEXT NOT NULL,
      album TEXT,
      duracao_s REAL NOT NULL,
      genero TEXT DEFAULT 'geral',
      energia INTEGER DEFAULT 3,
      bpm INTEGER,
      file_path TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      blocos_permitidos TEXT DEFAULT 'todos',
      separacao_min INTEGER DEFAULT 60,
      ultima_execucao TEXT,
      status_direitos TEXT DEFAULT 'licensed',
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS Agenda (
      slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      horario_inicio TEXT NOT NULL,
      track_id TEXT,
      tipo_item TEXT DEFAULT 'musica',
      titulo TEXT,
      artista TEXT,
      duracao_s REAL,
      status TEXT DEFAULT 'pendente'
    );
    CREATE TABLE IF NOT EXISTS Historico (
      exec_id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id TEXT,
      titulo TEXT,
      artista TEXT,
      data_hora TEXT DEFAULT (datetime('now','localtime')),
      duracao_real REAL,
      status_sucesso INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS Comerciais (
      spot_id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT,
      titulo TEXT,
      arquivo TEXT,
      contrato_inicio TEXT,
      contrato_fim TEXT,
      frequencia INTEGER DEFAULT 4,
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS Vinhetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      arquivo TEXT,
      atalho INTEGER
    );
  `);
  return db;
}

module.exports = { getDb, DB_PATH };
