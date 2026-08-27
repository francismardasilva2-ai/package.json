const audio = document.getElementById('player');
const $ = (id) => document.getElementById(id);
let estado = null, cart = [], fila = [], mutado = false, tocarAutomatico = false, srcAtual = null, timerSemAudio = null;

// ---- Temas ----
function aplicarTema(t) { document.body.dataset.theme = t; localStorage.setItem('rc-tema', t); }
document.querySelectorAll('.cor').forEach((b) => b.addEventListener('click', () => aplicarTema(b.dataset.tema)));
aplicarTema(localStorage.getItem('rc-tema') || 'ciano');

// ---- Relógio ----
function relogio() {
  const a = new Date();
  $('relogio').textContent = a.toLocaleTimeString('pt-BR', { hour12: false });
  $('data-extenso').textContent = a.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
setInterval(relogio, 1000); relogio();

// ---- Estado ----
async function carregarStatus() {
  try {
    const s = await (await fetch('/api/status')).json();
    estado = s;
    renderizarAgora(s);
    fila = await (await fetch('/api/timeline')).json();
    renderizarFila(fila);
    if (!cart.length) { cart = await (await fetch('/api/cartwall')).json(); renderizarCartwall(cart); }
  } catch (e) { $('m-onair').textContent = 'OFFLINE'; }
}

function renderizarAgora(s) {
  $('m-onair').textContent = s.on_air ? 'NO AR' : 'PARADO';
  $('m-musicas').textContent = s.tocadas_hoje;
  $('m-blocos').textContent = s.comerciais_hoje;
  $('m-uptime').textContent = Math.floor(s.uptime_s / 60) + ' min';
  if (timerSemAudio) { clearTimeout(timerSemAudio); timerSemAudio = null; }
  if (!s.atual) {
    $('titulo-atual').textContent = 'Aguardando grade...';
    $('artista-atual').textContent = '—';
    return;
  }
  const a = s.atual;
  $('titulo-atual').textContent = a.titulo;
  $('artista-atual').textContent = a.artista;
  $('tag-tipo').textContent = (a.tipo || 'musica').toUpperCase();
  $('badge-duracao').textContent = Math.round(a.duracao_s) + 's';
  $('cronometro').textContent = '-' + Math.round(a.duracao_s) + 's';
  if (a.file_url && srcAtual !== a.file_url) {
    srcAtual = a.file_url;
    audio.src = a.file_url;
    if (tocarAutomatico) audio.play().catch(() => {});
  } else if (!a.file_url) {
    srcAtual = null;
    audio.removeAttribute('src');
    timerSemAudio = setTimeout(completarAtual, (a.duracao_s || 30) * 1000);
  }
}

function renderizarFila(f) {
  $('fila').innerHTML = f.map((i) =>
    `<li class="card-fila ${i.tipo}"><span class="hora">${i.horario_inicio}</span><div><strong>${i.titulo}</strong><small>${i.artista || ''} · ${Math.round(i.duracao_s)}s</small></div><span class="tag">${(i.tipo || 'musica').toUpperCase()}</span></li>`
  ).join('');
}

function renderizarCartwall(c) {
  $('cartwall').innerHTML = c.map((v) =>
    `<button class="pad" data-id="${v.id}"><kbd>${v.atalho}</kbd><span>${v.nome}</span></button>`
  ).join('');
  document.querySelectorAll('.pad').forEach((b) => b.addEventListener('click', () => dispararVinheta(b.dataset.id)));
}

async function dispararVinheta(id) {
  const r = await (await fetch('/api/player/quickstart/' + id)).json();
  if (r.file_url) { const v = new Audio(r.file_url); v.volume = 0.9; v.play().catch(() => {}); }
  const b = document.querySelector(`.pad[data-id="${id}"]`);
  if (b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 300); }
}

// ---- Controle ----
async function completarAtual() {
  if (!estado?.atual) return;
  await fetch('/api/player/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot_id: estado.atual.slot_id }) });
  carregarStatus();
}
async function pular() {
  if (!estado?.atual) return;
  await fetch('/api/player/next', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot_id: estado.atual.slot_id }) });
  carregarStatus();
}

$('btn-ar').addEventListener('click', () => {
  tocarAutomatico = true;
  audio.play().catch(() => {});
  $('btn-ar').textContent = 'NO AR ✓';
});
audio.addEventListener('ended', completarAtual);

window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '8') { const v = cart.find((c) => c.atalho === Number(e.key)); if (v) dispararVinheta(v.id); }
  if (e.code === 'Space') { e.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
  if (e.key === 'n' || e.key === 'N') pular();
  if (e.key === 'm' || e.key === 'M') { mutado = !mutado; audio.muted = mutado; }
});

setInterval(carregarStatus, 5000);
carregarStatus();
