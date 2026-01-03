export interface Message {
    id: string;
    text: string;
    author?: string;
}

export const RAW_MESSAGES: Message[] = [
    { id: '1', text: "A vida é como uma árvore, suas raízes definem sua força.", author: "Provérbio" },
    { id: '2', text: "Respire fundo. A calma é a resposta para muitas perguntas.", author: "Desconhecido" },
    { id: '3', text: "Cada folha que cai é uma oportunidade de renovação.", author: "Sabedoria Zen" },
    { id: '4', text: "A natureza não tem pressa, e tudo se realiza.", author: "Lao Tsé" },
    { id: '5', text: "Seja como a árvore: mude suas folhas, mas mantenha suas raízes intactas.", author: "Victor Hugo" },
    { id: '6', text: "A beleza da vida está nos pequenos detalhes, como o farfalhar das folhas ao vento." },
    { id: '7', text: "Crescer dói, mas é a única maneira de tocar o céu." },
    { id: '8', text: "O silêncio das árvores ensina mais que palavras.", author: "Provérbio Celta" },
    { id: '9', text: "Permita-se florescer no seu próprio tempo." },
    { id: '10', text: "A esperança é a última folha a cair, e a primeira a renascer." },
    { id: '11', text: "Você é mais forte do que imagina. Acredite." },
    { id: '12', text: "Dias nublados também nutrem a terra." },
    { id: '13', text: "A paz interior é o seu maior tesouro." },
    { id: '14', text: "Gentileza gera gentileza, assim como sementes geram frutos." },
    { id: '15', text: "Tudo passa. Inclusive as tempestades." }
];
