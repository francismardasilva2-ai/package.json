const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFile } = require('music-metadata');
const { getDb } = require('./database');

const EXTENSOES = ['.mp3', '.wav', '.aac', '.flac', '.opus', '.m4a', '.ogg'];

function hashArquivo(caminho) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(caminho);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function parsearNome(nome) {
  const base = nome.replace(/\.[^.]+$/, '');
  const partes = base.split(' - ');
  if (partes.length >= 2) return { artista: partes[0].trim(), titulo: partes.slice(1).join(' - ').trim() };
  return { artista: 'Desconhecido', titulo: base.trim() };
}

async function importarPasta(pasta) {
  const db = getDb();
  const quarantineDir = path.join(path.dirname(pasta), 'quarantine');
  if (!fs.existsSync(quarantineDir)) fs.mkdirSync(quarantineDir, { recursive: true });
  const arquivos = fs.readdirSync(pasta).filter((f) => EXTENSOES.includes(path.extname(f).toLowerCase()));

  const upsert = db.prepare(`INSERT INTO Catalogo (track_id, titulo, artista, album, duracao_s, genero, energia, bpm, file_path, file_hash, ultima_execucao, status_direitos, ativo)
    VALUES (@track_id, @titulo, @artista, @album, @duracao_s, @genero, @energia, @bpm, @file_path, @file_hash, NULL, 'licensed', 1)
    ON CONFLICT(track_id) DO UPDATE SET file_path=@file_path, duracao_s=@duracao_s`);

  let importados = 0, ignorados = 0, quarentena = 0;

  for (const nome of arquivos) {
    const caminho = path.join(pasta, nome);
    try {
      const hash = await hashArquivo(caminho);
      const meta = await parseFile(caminho, { duration: true });
      const duracao = meta.format.duration || 0;
      if (duracao < 3) {
        fs.renameSync(caminho, path.join(quarantineDir, nome));
        quarentena++;
        continue;
      }
      if (db.prepare('SELECT track_id FROM Catalogo WHERE file_hash = ?').get(hash)) {
        ignorados++;
        continue;
      }
      const { artista, titulo } = parsearNome(nome);
      const track_id = 'trk_' + hash.slice(0, 16);
      upsert.run({
        track_id,
        titulo: meta.common.title || titulo,
        artista: meta.common.artist || artista,
        album: meta.common.album || '',
        duracao_s: duracao,
        genero: (meta.common.genre || ['geral'])[0] || 'geral',
        energia: 3,
        bpm: null,
        file_path: caminho,
        file_hash: hash
      });
      importados++;
    } catch (e) {
      try {
        fs.renameSync(caminho, path.join(quarantineDir, nome));
        quarentena++;
      } catch (_) {
        ignorados++;
      }
    }
  }
  return { importados, ignorados, quarentena, total: arquivos.length };
}

if (require.main === module) {
  const pasta = process.argv[2] || path.join(__dirname, '..', 'media', 'music');
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
  importarPasta(pasta)
    .then((r) => {
      console.log(`📥 Importação: ${r.importados} importadas, ${r.ignorados} ignoradas, ${r.quarentena} em quarentena.`);
      const hoje = new Date();
      const data = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
      const { gerarGrade } = require('./scheduler');
      const g = gerarGrade(data);
      console.log(`📅 Grade do dia ${data}: ${g.itens} itens programados.`);
    })
    .catch((e) => {
      console.error('Erro na importação:', e.message);
      process.exit(1);
    });
}

module.exports = { importarPasta };
