# Licença dos efeitos sonoros — Todos os Direitos Reservados

Copyright © 2026 Cláudia Dias Roxinol e Kayque Rotondo. **Todos os Direitos Reservados (All Rights Reserved).**

## O que este arquivo cobre

Todos os arquivos de áudio dentro de `Sounds/SFX/` e das suas subpastas (`Player/`, `Environment/` e `RSE/`):
efeitos de interface e de ação, ambiências e vozes dos personagens do jogo **Guardião da Água**. Foram gerados com
**ElevenLabs Sound Effects v2** (`eleven_text_to_sound_v2`) numa conta paga e depois editados e masterizados para o
jogo. O registro de cada arquivo (prompt, data, versão escolhida) está em `Sounds/_prompts.json`.

Estes arquivos **não** estão sob a licença CC0 1.0 do arquivo [`LICENSE`](../../LICENSE) na raiz do repositório.

## O que é permitido

Os efeitos sonoros são distribuídos **exclusivamente para uso integrado à execução deste jogo**. Pode:

- jogar o Guardião da Água, no site publicado ou numa cópia local, com os sons tocando dentro do jogo;
- clonar ou fazer fork deste repositório e rodar o jogo, ou uma versão modificada do código, com estes arquivos sem
  alteração e nos caminhos em que estão, desde que este arquivo siga junto na mesma pasta;
- gravar e mostrar o jogo em funcionamento (aula, apresentação, vídeo, transmissão), com os sons tocando como parte
  da partida.

## O que é proibido

Sem autorização por escrito dos titulares, é estritamente proibido:

- **extrair** os arquivos de áudio do jogo ou deste repositório para usá-los fora da execução do Guardião da Água;
- **redistribuir** os arquivos de forma isolada (*standalone*), em pacotes, bancos de sons, coletâneas ou em outros
  jogos, aplicativos, vídeos ou obras;
- **sublicenciar**, vender, alugar ou ceder estes arquivos, no todo ou em parte, modificados ou não;
- usar os arquivos, no todo ou em parte, para **treinar, ajustar, avaliar ou alimentar modelos de inteligência
  artificial** ou de aprendizado de máquina, ou para montar conjuntos de dados com esse fim.

A dedicação CC0 do código não se estende a estes arquivos, nem mesmo quando acompanham uma cópia do código.

## Por que existe esta exceção

Os termos de uso da ElevenLabs dão ao assinante pago direitos sobre o áudio gerado, mas o projeto não quer liberar
esses sons como domínio público. O código, as músicas (Google Lyria 3, em `Sounds/BGM/`), as imagens e os modelos
próprios seguem em CC0 1.0.

## Como o jogo entrega os sons

O jogo roda no navegador e não tem etapa de build: o GitHub Pages publica o repositório como está
(`.github/workflows/pages.yml`) e o navegador baixa cada `.mp3` quando o jogo precisa dele. Por isso os arquivos ficam
acessíveis pela rede, como em qualquer jogo web. Essa acessibilidade técnica **não** é licença: o uso permitido é só o
descrito acima. Empacotar os sons num arquivo único não impediria a extração e exigiria mudar o carregamento
(`js/utils/AudioManager.js`), por isso não foi feito.

## Contato

Pedidos de autorização para outros usos: abra uma *issue* em
[github.com/kayquer/guardiao_da_agua_js](https://github.com/kayquer/guardiao_da_agua_js/issues).
