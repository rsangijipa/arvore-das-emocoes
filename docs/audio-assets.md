# Assets de áudio

O motor de som usa `howler` e espera estes arquivos em `public/audio`:

| Arquivo | Uso |
| --- | --- |
| `ambient-loop.mp3` | leito ambiente contínuo (em loop) |
| `leaf-hover.mp3` | tilintar sutil ao passar sobre uma folha-mensagem |
| `leaf-click.mp3` | folha se soltando da árvore |
| `quote-random.mp3` | pedido de mensagem pelo botão |
| `favorite-soft.mp3` | confirmação curta e quente ao guardar |

O áudio é **desligado por padrão**. Para ligar, defina `NEXT_PUBLIC_ENABLE_AUDIO=1`
no `.env.local`. Sem os arquivos, a aplicação continua funcionando em silêncio —
`howler` é criado com `onloaderror`/`onplayerror` silenciosos.

A trilha só começa depois do primeiro gesto do usuário (`pointerdown` ou
`keydown`), como exigem as políticas de autoplay dos navegadores.
