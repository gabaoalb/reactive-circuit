# Reactive Circuit

Simulador de circuitos elétricos DC inteiramente no navegador, feito com React, TypeScript e React Konva. Inclui resistores, fontes ideais de tensão, fios e junções explícitas.

## Executar

Use Node.js compatível com o Vite 8 instalado (20.19+ ou 22.12+) e npm.

```sh
npm install
npm run dev
```

## Idiomas

A interface oferece português brasileiro, inglês e espanhol pelo seletor no cabeçalho. A preferência fica salva no navegador; no primeiro acesso, usa o primeiro idioma compatível da lista do navegador, com português brasileiro como alternativa. Trocar o idioma preserva o circuito e os resultados. Os campos numéricos continuam aceitando ponto decimal e notação científica, como `1e3`.

Os catálogos estão em `src/i18n/pt-BR.json`, `en.json` e `es.json`. A configuração em `src/i18n/index.ts` usa i18next e react-i18next. Mantenha as mesmas chaves e parâmetros de interpolação nos três arquivos. Diagnósticos são traduzidos na interface pelos códigos do motor, que permanece independente da internacionalização.

## Usar o editor

1. O exemplo inicial é um divisor: fonte de 10 V e dois resistores de 1 kΩ. Clique em **Simular** para obter 5 V no nó intermediário e 5 mA nos resistores.
2. **Novo circuito** limpa o documento. Escolha **Resistor**, **Fonte DC** ou **Junção**, depois clique na grade. A ferramenta volta para seleção após inserir.
3. Em **Selecionar**, clique no componente para editar seu valor em Ω ou V, aplique a alteração e use **Girar 90°**. Arraste o corpo para mover o componente inteiro ou uma das pontas para reposicionar apenas aquele terminal. A outra ponta fica fixa; o símbolo mantém seu tamanho, fica no ponto médio e acompanha a direção entre as pontas. Apenas as pernas mudam de comprimento. A distância mínima entre terminais é 80 px, para evitar sobreposição do símbolo. Terminais e junções usam a grade de 20 px.
4. Escolha **Fio**, clique no terminal inicial, clique na grade para adicionar cotovelos e termine em outro terminal ou junção. Cada trecho é roteado horizontalmente e depois verticalmente. Para ramificar, crie uma junção e termine os fios nela. Cruzamentos, sobreposições e cotovelos não criam conexões automáticas.
5. Escolha **Terra** e clique em um terminal ou junção. Uma nova marca substitui a anterior; não une pontos eletricamente.
6. Clique em **Simular**. A interface mostra tensões, correntes, identificadores dos nós e uma seção expansível com a matriz MNA, as incógnitas, o vetor independente, a solução e o resíduo.

As portas são **a** e **b**, respectivamente à esquerda e à direita antes da rotação. Fontes impõem `Va − Vb = E`. Todas as correntes são positivas de a para b: uma fonte alimentando uma carga normalmente apresenta corrente negativa. Os valores são armazenados em unidades SI; os campos aceitam notação científica como `1e3`, sem sufixos de unidade.

Em **Ao mover o componente**, escolha **Manter conexões** (padrão) para que os fios acompanhem o corpo, ou **Desconectar ao mover** para levantar o componente do circuito. No segundo modo, os fios e o terra ficam nas posições antigas, ligados a junções criadas nas pontas; vários fios na mesma porta continuam ligados entre si. Ao arrastar um terminal, apenas a ponta movida é desconectada; a outra permanece fixa e conectada. A desconexão acontece somente quando há deslocamento efetivo, não ao clicar, girar ou tentar aproximar demais os terminais. A opção é preservada ao criar outro circuito ou carregar o exemplo, mas não após recarregar a página. Reconexões continuam explícitas pela ferramenta Fio.

**Escape** cancela a ferramenta e o fio em andamento. **Delete** ou **Excluir** remove a seleção. Excluir um componente ou junção remove os fios incidentes e a referência de terra, se marcada nele. Atalhos não interferem nos campos de texto. Edições invalidam resultados anteriores.

## Separação de responsabilidades

A interface usa os temas claro e escuro do Material UI, definidos em `src/theme.ts`, com `ThemeProvider` e `CssBaseline`. O botão no cabeçalho mostra um sol amarelo no tema escuro (ativa o claro) e uma lua azul no tema claro (ativa o escuro). A preferência é salva no `localStorage` como `reactive-circuit.theme`; sem preferência válida, o tema inicial é escuro. Se o armazenamento estiver bloqueado, a alternância continua funcionando durante a sessão. O layout é estilizado pela API `styled` em `src/app/AppShell.tsx`; os painéis, tabelas e opções de conexão usam componentes Material UI. O canvas obtém as cores da mesma paleta, incluindo símbolos, fios, grade, terminais e seleção.

- `src/domain`: documento serializável, componentes, referências de terminais, junções e fios. IDs identificam conexões; coordenadas representam apenas geometria.
- `src/editor`: reducer com comandos de edição, geometria ortogonal e renderização no canvas. Estado React controla posições e conectividade; não há extração a partir de pixels ou serialização do Konva.
- `src/simulation`: funções puras, sem React/DOM/canvas, para grafo, validação, MNA, solver e resultados.
- `src/app`: composição da interface MUI e coordenação entre edição e análise.

Fluxo: `CircuitDocument → buildElectricalGraph → assembleMna → solveLinearSystem → SimulationOutcome`.

`ComponentShape` desenha o símbolo de tamanho fixo e as pernas variáveis. `CircuitCanvas` coordena os terminais arrastáveis e as ferramentas. A geometria mantém centro, ângulo e distância entre terminais (`length`, com padrão de 80 px); a conectividade continua baseada em IDs, independentemente da forma do desenho.

`buildElectricalGraph` contrai fios ideais usando Union-Find. Terminais e junções unidos por fios formam nós; componentes são ramos. O terra é N0 e a numeração é determinística para o mesmo documento. Junções sem ligação a componentes não entram na análise.

`assembleMna` monta `[G B; Bᵀ 0] [v; iV] = [0; e]`: tensões dos nós exceto terra e uma corrente por fonte de tensão. Resistores contribuem com `1/R`; fontes acrescentam restrições de tensão. Referência matemática: [documentação técnica do Qucs](https://qucs.sourceforge.net/tech/node14.html).

O solver usa eliminação gaussiana densa com escalonamento de linhas, pivoteamento parcial e substituição retroativa, preservando os dados de entrada. As tolerâncias centralizadas são `1e-12` para pivôs escalonados e `1e-9` para resíduo normalizado. Não há inversão de matriz nem resistências artificiais. Sistemas incompatíveis ou sem solução única retornam diagnósticos em vez de resultados arbitrários.

## Verificação

```sh
npm test
npm run build
npm run lint
npm run fmt:check
```

`npm run test:watch` executa Vitest em observação. `npm run fmt` aplica Oxfmt: dois espaços, aspas duplas, ponto e vírgula e LF. TypeScript usa `strict`. `npm run preview` serve o build de produção.

Os testes cobrem cargas conhecidas, divisor, paralelos, fontes entre nós não aterrados, sinais de corrente, validação, fontes contraditórias/redundantes, contração de fios, invariância geométrica, comandos de edição, pivoteamento, singularidade e resíduo.

## Limites desta versão

- Apenas análise DC linear, em regime permanente, com componentes ideais e resistências positivas finitas.
- Sem fontes de corrente, elementos reativos, semicondutores ou análise AC/transiente.
- Não calcula correntes individuais dos fios ideais: em redes com caminhos redundantes elas podem ser indeterminadas.
- Subcircuitos flutuantes e fontes redundantes ou contraditórias impedem a análise; circuitos abertos que tenham solução única são aceitos.
- Solver denso síncrono voltado a circuitos pequenos; valores extremos ou sistemas próximos da singularidade podem ser rejeitados pela tolerância numérica.
- Sem persistência, zoom, pan ou histórico. Recarregar a página reinicia o circuito; a edição gráfica requer interação por ponteiro.
