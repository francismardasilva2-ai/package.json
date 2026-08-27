// ============================================================
//  RADIOCORE - CONFIGURAÇÃO CENTRAL
//  Edite este arquivo para configurar toda a sua rádio.
//  Cada seção tem uma explicação do que faz.
// ============================================================

const path = require('path');

module.exports = {
  // ----------------------------------------------------------
  // 1. SERVIDOR
  // ----------------------------------------------------------
  server: {
    porta: 3000,                    // Porta onde a rádio abre no navegador (localhost:3000)
    host: '0.0.0.0',                // '0.0.0.0' permite acesso de outros computadores da rede
  },

  // ----------------------------------------------------------
  // 2. PASTAS DE MÍDIA
  //    Coloque seus arquivos dentro destas pastas.
  //    O sistema cria todas automaticamente ao iniciar.
  // ----------------------------------------------------------
  pastas: {
    raiz: path.join(__dirname, 'media'),   // Pasta principal de mídia
    music: 'music',                        // Músicas (Artista - Música.mp3)
    vinhetas: 'vinhetas',                  // Vinhetas e efeitos (QuickStart)
    programas: 'programas',                // Programas gravados / blocos especiais
    spots: 'spots',                        // Comerciais / spots publicitários
    emergencia: 'emergencia',              // Playlist de emergência (fallback)
  },

  // ----------------------------------------------------------
  // 3. AUTOMAÇÃO DA GRADE
  // ----------------------------------------------------------
  automacao: {
    separacao_artista_min: 60,     // Mínimo de minutos entre músicas do mesmo artista
    separacao_faixa_min: 30,       // Mínimo de minutos entre a mesma faixa
    energia_max_variacao: 2,       // Variação máxima de energia entre faixas consecutivas
    blocos_comerciais: [           // Horários dos blocos comerciais (HH:MM)
      '09:00', '12:00', '15:00', '18:00', '21:00'
    ],
    spots_por_bloco: 2,            // Quantos spots em cada bloco comercial
    duracao_max_spot_s: 30,        // Duração máxima de cada spot (segundos)
  },

  // ----------------------------------------------------------
  // 4. CROSSFADE (transição entre músicas)
  // ----------------------------------------------------------
  crossfade: {
    ativo: true,                   // true = transição suave | false = corte seco
    duracao_s: 4,                  // Duração do crossfade em segundos
    volume_fade: 0.7,              // Volume durante a transição (0 a 1)
  },

  // ----------------------------------------------------------
  // 5. LOCUÇÃO AUTOMÁTICA (TTS)
  // ----------------------------------------------------------
  tts: {
    ativo: false,                  // true = ativa as locuções automáticas
    hora_certa: true,              // Anuncia a hora certa
    temperatura: false,            // Anuncia a temperatura (precisa de API)
    idioma: 'pt-BR',               // Idioma da voz
    voz: 'Microsoft Maria Online (Natural) - Portuguese (Brazil)',
    intervalo_hora_min: 60,        // A cada quantos minutos anuncia a hora
  },

  // ----------------------------------------------------------
  // 6. WATCHDOG (recuperação automática)
  // ----------------------------------------------------------
  watchdog: {
    ativo: true,                   // true = monitora e reinicia o player se travar
    timeout_sem_audio_s: 30,       // Segundos sem áudio antes de considerar travado
    reiniciar_automatico: true,    // Reinicia o playout automaticamente
  },

  // ----------------------------------------------------------
  // 7. METADADOS / RDS (exportar o que está tocando)
  // ----------------------------------------------------------
  rds: {
    ativo: true,                   // true = gera o arquivo de metadados
    arquivo_saida: path.join(__dirname, 'public', 'nowplaying.json'), // Arquivo que o site/app lê
    formato: 'json',               // json ou xml
  },

  // ----------------------------------------------------------
  // 8. RELATÓRIOS (ECAD)
  // ----------------------------------------------------------
  relatorios: {
    pasta_saida: path.join(__dirname, 'relatorios'),  // Onde os relatórios são salvos
    formato: 'csv',                // csv ou json
  },
};
