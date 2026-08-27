// ============================================================
//  RADIOCORE - WATCHDOG (Recuperação Automática)
//  Monitora o playout 24/7 e se recupera sozinho de falhas,
//  registrando cada evento para auditoria.
// ============================================================

const config = require('../config');
const { getDb } = require('./database');

const estado = {
  ativo: !!(config.watchdog && config.watchdog.ativo),
  inicio: Date.now(),
  ultimo_heartbeat: Date.now(),
  ultimo_progresso: null,
  tocando: false,
  esteve_no_ar: false,
  falhas: 0,
  recuperacoes: 0,
  ultima_recuperacao: null,
};

function registrarLog(tipo, detalhe) {
  try {
    const db = getDb();
    db.prepare('INSERT INTO WatchdogLog (tipo, detalhe) VALUES (?, ?)').run(tipo, detalhe);
  } catch (e) {
    // Um erro de log não pode derrubar o watchdog
  }
}

function heartbeat(dados) {
  const agora = Date.now();
  estado.ultimo_heartbeat = agora;
  estado.tocando = !!(dados && dados.tocando);
  if (estado.tocando) estado.esteve_no_ar = true;

  if (dados && typeof dados.posicao === 'number' && dados.track_id) {
    const p = { track_id: dados.track_id, posicao: dados.posicao, quando: agora };
    if (!estado.ultimo_progresso || estado.ultimo_progresso.track_id !== dados.track_id) {
      estado.ultimo_progresso = p;
    } else if (dados.posicao > estado.ultimo_progresso.posicao) {
      estado.ultimo_progresso = p;
    }
  }
  return { ok: true };
}

function estaTravado() {
  const timeout = (config.watchdog && config.watchdog.timeout_sem_audio_s) || 30;
  const agora = Date.now();

  if (estado.esteve_no_ar && agora - estado.ultimo_heartbeat > timeout * 1000) {
    return { travado: true, motivo: 'sem_sinal',
      detalhe: 'Sem sinal do player há ' + Math.round((agora - estado.ultimo_heartbeat) / 1000) + 's' };
  }

  if (estado.tocando && estado.ultimo_progresso &&
      agora - estado.ultimo_progresso.quando > timeout * 1000) {
    return { travado: true, motivo: 'audio_parado',
      detalhe: 'Áudio parado na mesma posição há ' + Math.round((agora - estado.ultimo_progresso.quando) / 1000) + 's' };
  }

  return { travado: false };
}

function recuperar(motivo, detalhe) {
  const quando = new Date().toISOString();
  estado.falhas += 1;
  estado.recuperacoes += 1;
  estado.ultima_recuperacao = quando;
  estado.ultimo_heartbeat = Date.now();
  estado.ultimo_progresso = null;
  estado.tocando = false;

  registrarLog('instabilidade', (detalhe || '') + ' [' + (motivo || 'desconhecido') + ']');
  registrarLog('recuperacao', 'Playout reiniciado automaticamente em ' + quando);

  return {
    ok: true,
    recuperado: true,
    instrucao: 'reload',
    quando,
    falhas: estado.falhas,
  };
}

function verificar() {
  if (!estado.ativo) return { ok: true, ativo: false };
  const r = estaTravado();
  if (r.travado) return recuperar(r.motivo, r.detalhe);
  return { ok: true, travado: false };
}

function estatisticas() {
  return {
    ativo: estado.ativo,
    uptime_s: Math.floor((Date.now() - estado.inicio) / 1000),
    tocando: estado.tocando,
    falhas: estado.falhas,
    recuperacoes: estado.recuperacoes,
    ultima_recuperacao: estado.ultima_recuperacao,
    ultimo_sinal_s: Math.floor((Date.now() - estado.ultimo_heartbeat) / 1000),
  };
}

let timer = null;

function iniciar() {
  if (!estado.ativo || timer) return;
  timer = setInterval(() => { verificar(); }, 5000);
  registrarLog('inicio', 'Watchdog iniciado (timeout ' + (config.watchdog.timeout_sem_audio_s || 30) + 's)');
}

function parar() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { iniciar, parar, heartbeat, verificar, recuperar, estatisticas };
