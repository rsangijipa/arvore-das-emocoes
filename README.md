# Árvore das Emoções

Experiência 3D contemplativa em Next.js: uma árvore gerada do zero a cada visita, com dez folhas que carregam mensagens de acolhimento.

## Executar localmente

```bash
npm install
npm run dev
```

## Arquitetura implementada

- Frontend PWA com Service Worker (`public/sw.js`) para cache de app shell, chunks do Next e assets 3D/texturas.
- Cache de `/api/quotes/*` com estrategia stale-while-revalidate para abrir rapido na segunda visita e manter funcionamento offline.
- Backend com Firestore para leitura da colecao `quotes` (com fallback local se Firebase nao estiver configurado).
- Colecao `user_interactions` para mapear tema/acao/quote com timestamp.
- Autenticação anônima (`signInAnonymously`); o UID vai no `Authorization: Bearer <ID token>` e o servidor valida com `verifyIdToken` — o dono das favoritas é sempre o UID do token, nunca um id enviado pelo cliente.
- Favoritos persistidos em nuvem na colecao `user_favorites` e espelhados localmente para resiliencia offline.

## Variaveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## Estrutura esperada no Firestore

- `quotes/{quoteId}`
  - `id`, `text`, `theme`, `tone`, `active`, `createdAt`, `updatedAt`, `author?`
- `user_interactions/{autoId}`
  - `sessionId`, `actionType`, `quoteId?`, `theme`, `createdAt`
- `user_favorites/{sessionId}`
  - `quoteIds: string[]`, `updatedAt`
