const express = require('express');
const path = require('path');
const { getDb } = require('./database');
const { gerarGrade } = require('./scheduler');
const { importarPasta } = require('./importer');
const { estadoAtual, filaProximas, registrarExecucao, pularFaixa, cartwall, urlDeArquivo, hoje } = require('./player');

const MEDIA_ROOT = path.join(__dirname, '..', 'media');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORTA = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use('/media', express.static(MEDIA_ROOT));
app.use(express.static(PUBLIC_DIR));

app.get('/api/status', (req, res) => res.json(estadoAtual()));
app.get('/api/timeline', (req, res) => res.json(filaProximas(5)));
app.get('/api/cartwall', (req, res) => res.json(cartwall()));

app.post('/api/player/complete', (req, res) => {
  const item = registrarExecucao(req.body.slot_id);
  res.json({ ok: !!item, proximo: filaProximas(1)[0] || null });
});
app.post('/api/player/next', (req, res) => {
  const item = pularFaixa(req.body.slot_id);
  res.json({ ok: !!item, proximo: filaProximas(1)[0] || null });
});
app.post('/api/player/quickstart/:id', (req, res) => {
  const db = getDb();
  const v = db.prepare('SELECT * FROM Vinhetas WHERE id = ?').get(req.params.id);
  res.json(v ? { nome: v.nome, file_url: v.arquivo ? urlDeArquivo(v.arquivo) : null } : { erro: 'Vinheta não encontrada' });
});
app.post('/api/import', async (req, res) => {
  const pasta = req.body.pasta || path.join(MEDIA_ROOT, 'music');
  const r = await importarPasta(pasta);
  const g = gerarGrade(hoje());
  res.json({ importacao: r, grade: g });
});

const db = getDb();
if (!db.prepare('SELECT COUNT(*) c FROM Agenda WHERE data = ?').get(hoje()).c) {
  gerarGrade(hoje());
}

app.listen(PORTA, () => console.log(`🎧 RadioCore Player no ar em http://localhost:${PORTA}`));
