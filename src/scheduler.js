const { getDb } = require('./database');

const HORAS_DIA = [
  { nome: 'Madrugada', ini: 0, fim: 6, generos: ['instrumental', 'soft', 'mpb', 'eletronica'], energia: 2 },
  { nome: 'Manhã', ini: 6, fim: 12, generos: ['mpb', 'pop', 'samba', 'sertanejo'], energia: 3 },
  { nome: 'Tarde', ini: 12, fim: 18, generos: ['pop', 'rock', 'sertanejo', 'forro'], energia: 4 },
  { nome: 'Noite', ini: 18, fim: 24, generos: ['mpb', 'rock', 'eletronica', 'pop'], energia: 3 }
];

function blocoDaHora(hora) {
  return HORAS_DIA.find((b) => hora >= b.ini && hora < b.fim);
}

function paraHHMMSS(seg) {
  seg = Math.floor(seg % 86400);
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

function gerarGrade(dataISO) {
  const db = getDb();
  db.prepare('DELETE FROM Agenda WHERE data = ?').run(dataISO);
  const faixas = db.prepare("SELECT * FROM Catalogo WHERE ativo = 1 AND status_direitos = 'licensed'").all();
  const inserir = db.prepare(
    'INSERT INTO Agenda (data, horario_inicio, track_id, tipo_item, titulo, artista, duracao_s, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const ultimosPorArtista = {};
  let atual = 0;
  let itens = 0;

  while (atual < 86400 && itens < 300) {
    const hora = Math.floor(atual / 3600);
    const bloco = blocoDaHora(hora);

    let candidatos = faixas.filter((f) => {
      const ultimo = ultimosPorArtista[f.artista];
      return !ultimo || atual - ultimo >= (f.separacao_min || 60) * 60;
    });
    if (candidatos.length < 3) candidatos = faixas;

    let escolha = null;
    if (candidatos.length) {
      escolha = candidatos
        .map((f) => {
          let score = 0;
          const gen = (f.genero || '').toLowerCase();
          if (bloco) {
            if (bloco.generos.some((g) => gen.includes(g))) score += 3;
            score += Math.max(0, 2 - Math.abs((f.energia || 3) - bloco.energia));
          }
          if (f.ultima_execucao) score += Math.min(5, (Date.now() - new Date(f.ultima_execucao).getTime()) / 86400000);
          if (ultimosPorArtista[f.artista]) score -= 10;
          return { f, score };
        })
        .sort((a, b) => b.score - a.score)[0].f;

      ultimosPorArtista[escolha.artista] = atual;
      db.prepare("UPDATE Catalogo SET ultima_execucao = datetime('now','localtime') WHERE track_id = ?").run(escolha.track_id);
      inserir.run(dataISO, paraHHMMSS(atual), escolha.track_id, 'musica', escolha.titulo, escolha.artista, escolha.duracao_s, 'pendente');
      atual += Math.round(escolha.duracao_s) + 2;
    } else {
      inserir.run(dataISO, paraHHMMSS(atual), null, 'emergencia', 'RadioCore Emergency Backup Track', 'Emergency', 30, 'pendente');
      atual += 32;
    }
    itens++;
  }
  return { itens };
}

module.exports = { gerarGrade, blocoDaHora };
