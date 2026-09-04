# Checklist visual de QA

Rodar antes de demos e releases.

## Geração da árvore

- Recarregar a página três vezes: a árvore deve ser **diferente** a cada vez.
- Nenhum galho é mais grosso que o galho (ou tronco) que o sustenta.
- Nenhuma "vara pelada": todo raminho fino termina com folhas.
- A base do tronco encosta no chão — sem flutuar nem afundar.
- Nenhum tubo oco visível nas pontas de galho ou no topo do tronco.
- Trocar o perfil de qualidade não muda a silhueta, apenas a tesselação.

## Iluminação e fundo

- Girar 360°: a árvore continua iluminada de frente em qualquer ângulo.
- A copa nunca fecha em preto (sinal de acne de sombra).
- O panorama não mostra costura ao completar a volta.
- O horizonte do chão 3D emenda com a grama do panorama, sem linha dura.

## Folhas com mensagem

- Contar 10 folhas maiores, em tons terrosos, com halo pulsante.
- Passar o cursor: a folha cresce, clareia e o cursor vira `pointer`.
- Clicar: a folha **se solta**, rodopia e voa até a frente da câmera.
- A folha 3D se dissolve e o cartão SVG assume, sem salto de tamanho.
- A mensagem aparece legível sobre a folha, com fundo mais escuro.
- Fechar: a folha volta para a copa, agora em tom apagado (lida).
- Clicar em "Outra folha": uma folha ainda não lida é sorteada.

## Interface

- `Escape` fecha o painel de mensagem e a gaveta de favoritas.
- Anel de foco visível em todos os botões e chips.
- O retorno de "guardada/removida" é anunciado por `aria-live`.
- Tabular a partir do topo alcança as 10 folhas (lista fora da tela).
- Chips de tema rolam na horizontal sem quebrar linha.
- Textos usam acentuação correta em toda a interface e no catálogo.
- Nomes de tema e tom aparecem como rótulo ("Autocuidado"), nunca como slug.

## Mobile (390x844 / 375x812)

- A folha pousa em retrato e o cartão SVG acompanha a orientação.
- Os botões de ação respeitam a `safe-area` inferior.
- O gesto de girar a cena funciona sem brigar com o scroll da página.

## Movimento reduzido

- Com `prefers-reduced-motion`, o voo da folha encurta e o vento diminui.
- A rotação automática da câmera fica desligada.
