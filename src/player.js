const path = require('path');
const { getDb } = require('./database');

const MEDIA_ROOT = path.join(__dirname, '..', 'media');

function hoje() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function horaAtual() {
  return new Date().toTimeString().slice(0, 8);
}
function urlDeArquivo(file_path) {
  if (!file_path) return null;
  return '/media/' + path.relative(MEDIA_ROOT, file_path).split(path.sep).join('/');
}

function proximoItem() {
  const db = getDb();
  const itens = db.prepare("SELECT * FROM Agenda WHERE data = ? AND status = 'pendente' ORDER BY horario_inicio ASC").all(hoje());
  if (!itens.length) return null;
  const agora = horaAtual();
  return itens.find((i) => i.horario_inicio <= agora) || itens[0];
}

function montarItem(i) {
  const db = getDb();
  const f = i.track_id ? db.prepare('SELECT file_path FROM Catalogo WHERE track_id = ?').get(i.track_id) : null;
  return {
    slot_id: i.slot_id,
    horario_inicio: i.horario_inicio,
    titulo: i.titulo,
    artista: i.artista,
    duracao_s: i.duracao_s,
    tipo: i.tipo_item,
    file_url: f ? urlDeArquivo(f.file_path) : null
  };
}

function estadoAtual() {
  const db = getDb();
  const atual = proximoItem();
  const tocadasHoje = db.prepare('SELECT COUNT(*) c FROM Historico WHERE date(data_hora) = date(\'now\',\'localtime\')').get().c;
  const comerciaisHoje = db.prepare("SELECT COUNT(*) c FROM Agenda WHERE data = ? AND tipo_item = 'emergencia' AND status = 'veiculado'").get(hoje()).c;
  return {
    on_air: !!atual,
    atual: atual ? montarItem(atual) : null,
    tocadas_hoje: tocadasHoje,
    comerciais_hoje: comerciaisHoje,
    uptime_s: Math.round(process.uptime()),
    servidor: new Date().toISOString()
  };
}

function filaProximas(n = 5) {
  const db = getDb();
  const itens = db.prepare("SELECT * FROM Agenda WHERE data = ? AND status = 'pendente' ORDER BY horario_inicio ASC").all(hoje());
  const atual = proximoItem();
  let idx = 0;
  if (atual) {
    idx = itens.findIndex((i) => i.slot_id === atual.slot_id);
    if (idx < 0) idx = 0;
  }
  return itens.slice(idx, idx + n).map(montarItem);
}

function registrarExecucao(slot_id) {
  const db = getDb();
  const item = db.prepare('SELECT * FROM Agenda WHERE slot_id = ?').get(slot_id);
  if (!item) return null;
  db.prepare("UPDATE Agenda SET status = 'veiculado' WHERE slot_id = ?").run(slot_id);
  db.prepare('INSERT INTO Historico (track_id, titulo, artista, duracao_real, status_sucesso) VALUES (?, ?, ?, ?, 1)').run(item.track_id, item.titulo, item.artista, item.duracao_s);
  return item;
}

function pularFaixa(slot_id) {
  return registrarExecucao(slot_id);
}

function cartwall() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) c FROM Vinhetas').get().c;
  if (!count) {
    const seed = ['Vinheta Abertura Manhã', 'Jingle News', 'Chamada Tarde', 'Vinheta Noite', 'Efeito Sonoro 5', 'Efeito Sonoro 6', 'Efeito Sonoro 7', 'Efeito Sonoro 8'];
    const ins = db.prepare('INSERT INTO Vinhetas (nome, arquivo, atalho) VALUES (?, ?, ?)');
    seed.forEach((nome, i) => ins.run(nome, null, i + 1));
  }
  return db.prepare('SELECT * FROM Vinhetas ORDER BY atalho ASC').all();
}

module.exports = { estadoAtual, filaProximas, registrarExecucao, pularFaixa, cartwall, urlDeArquivo, hoje };
