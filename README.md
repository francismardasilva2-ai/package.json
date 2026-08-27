# RadioCore Player

Automação e playout 24/7 para rádio, com dashboard moderno e dark mode.

## Como rodar

1. Instale o Node.js: https://nodejs.org (versão LTS)
2. No terminal, dentro da pasta do projeto:
   npm install
   npm start
3. Abra no navegador: http://localhost:3000
4. Clique no botão "TOMAR NO AR" para liberar o som

## Como adicionar músicas

Coloque arquivos MP3/WAV/AAC/FLAC/OPUS na pasta media/music
(dica: nomeie como "Artista - Titulo.mp3") e rode:

   npm run import

Depois recarregue a página do navegador.

## Testes

   npm test
