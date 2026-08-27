const test = require('node:test');
const assert = require('node:assert');
const { getDb } = require('../src/database');
const { gerarGrade } = require('../src/scheduler');

function seg(h) { const [x, y, z] = h.split(':').map(Number); return x * 3600 + y * 60 + z; }

test('banco cria tabelas e insere faixa', () => {
  const db = getDb();
  db.prepare("INSERT INTO Catalogo (track_id, titulo, artista, duracao_s, file_path, file_hash, status_direitos, ativo) VALUES ('trk_t1', 'Construção', 'Chico Buarque', 255, '/x.mp3', 'h1', 'licensed', 1) ON CONFLICT(track_id) DO NOTHING").run();
  const r = db.prepare("SELECT * FROM Catalogo WHERE track_id = 'trk_t1'").get();
  assert.equal(r.artista, 'Chico Buarque');
});

test('gerarGrade popula 24h sem emergência e respeita separação de artista', () => {
  const db = getDb();
  db.prepare('DELETE FROM Catalogo').run();
  const ins = db.prepare("INSERT INTO Catalogo (track_id, titulo, artista, duracao_s, genero, energia, file_path, file_hash, status_direitos, ativo) VALUES (?, ?, ?, 200, 'pop', 3, ?, ?, 'licensed', 1)");
  for (let i = 0; i < 20; i++) ins.run('trk_' + i, 'Música ' + i, 'Artista ' + i, '/x' + i + '.mp3', 'h' + i);

  const hoje = '2026-01-01';
  gerarGrade(hoje);
  const itens = db.prepare('SELECT * FROM Agenda WHERE data = ?').all(hoje);
  assert.ok(itens.length >= 20);
  assert.equal(itens.filter((i) => i.tipo_item === 'emergencia').length, 0);

  const tocadas = db.prepare('SELECT artista, horario_inicio FROM Agenda WHERE data = ? AND track_id IS NOT NULL ORDER BY horario_inicio').all(hoje);
  const pos = {};
  for (const a of tocadas) {
    if (pos[a.artista] !== undefined) assert.ok(seg(a.horario_inicio) - pos[a.artista] >= 3540, 'separação mínima de 60min');
    pos[a.artista] = seg(a.horario_inicio);
  }
});

test('gerarGrade usa emergência quando catálogo vazio', () => {
  const db = getDb();
  db.prepare('DELETE FROM Catalogo').run();
  const hoje = '2026-01-02';
  gerarGrade(hoje);
  const itens = db.prepare('SELECT * FROM Agenda WHERE data = ?').all(hoje);
  assert.ok(itens.length > 0);
  assert.equal(itens[0].tipo_item, 'emergencia');
});
