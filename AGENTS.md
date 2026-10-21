# Reactive Circuit

## Objetivo

Construir um simulador de circuitos elétricos 100% web com React e TypeScript. A edição dos circuitos, a simulação e a apresentação dos resultados devem funcionar no navegador, sem depender de um backend para o fluxo principal.

## Estado atual

- Aplicação com Vite, React e TypeScript em modo estrito.
- `src/main.tsx` inicializa a aplicação; `src/app/App.tsx` compõe editor, propriedades e resultados.
- MUI e Emotion estão disponíveis para a interface; Konva e React Konva, para o editor gráfico.
- React Compiler está configurado no Vite.
- `src/domain` define o documento; `src/editor` mantém comandos e geometria; `src/simulation` implementa grafo, MNA e motores DC e transiente puros.
- A página inicia com o exemplo RLC do Falstad em execução; `src/app/useSimulation.ts` coordena pausa, reinício, velocidade e atualização dos resultados. Capacitor, indutor e chave são componentes editáveis; o divisor anterior permanece como exemplo DC.
- Vitest cobre o núcleo elétrico e os comandos de edição. Oxfmt tem configuração explícita.
- Temas claro e escuro são definidos em `src/theme.ts`; `src/app/AppShell.tsx` mantém os estilos do layout.
- `src/i18n` contém as traduções em português brasileiro, inglês e espanhol.

## Diretrizes de implementação

- Use TypeScript para o código da aplicação e componentes funcionais React.
- Aproveite as dependências existentes antes de adicionar novas.
- Separe o modelo elétrico, o motor numérico, o estado do editor e a renderização. O motor deve ser testável sem React, DOM ou canvas.
- Represente componentes, terminais, conexões e resultados com tipos explícitos e identificadores estáveis. Não use coordenadas visuais como identidade elétrica.
- Mantenha valores físicos em unidades SI no modelo; faça conversões e formatação na interface.
- Diferencie dados editáveis do circuito de resultados calculados. Não persista resultados como fonte de verdade.
- Valide parâmetros e topologia e apresente erros compreensíveis. Não apresente resultados inventados quando a simulação falhar.
- Declare as hipóteses e os limites dos modelos elétricos implementados. Evolua os tipos de análise e componentes conforme os requisitos forem definidos.
- Preserve a responsividade do editor. Considere Web Workers quando o custo de simulação justificar.
- Ofereça rótulos acessíveis e interação por teclado nos controles de interface.
- Organize novos arquivos por responsabilidade conforme a aplicação crescer; evite estruturas antecipadas sem uso.
- Estilize a interface com Material UI usando `styled`, `sx` e os componentes existentes. Interface e canvas devem consumir a paleta do tema; evite cores fixas nos componentes, exceto indicações intencionais como sol amarelo e lua azul.
- Use i18n para novos textos visíveis, incluindo rótulos acessíveis e diagnósticos; mantenha as três traduções atualizadas. Não introduza dependências de tradução no motor elétrico puro.
- Tema e idioma são preferências persistidas em `localStorage`; o circuito continua apenas em memória. A interface deve funcionar mesmo quando o armazenamento estiver indisponível.
- Ao mover o corpo ou arrastar terminais, respeite a opção de manter ou desconectar conexões. Arrastar um terminal mantém a outra ponta fixa e o símbolo com tamanho constante. Ao desconectar, preserve os fios e o terra nas posições antigas por meio de junções; ao mover só uma ponta, desconecte apenas essa ponta.

## Verificação

- Scripts disponíveis: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`, `npm test`, `npm run test:watch`, `npm run fmt` e `npm run fmt:check`.
- Após alterações de código, execute `npm run build` e `npm run lint` quando aplicáveis e relate falhas ou limitações.
- Valide mudanças no motor com circuitos de solução conhecida, tolerâncias numéricas explícitas e casos inválidos usando Vitest.
- Para mudanças no editor, verifique os fluxos afetados no navegador quando possível.
- Para mudanças visuais, confira ambos os temas e o layout em tela menor. Para textos novos, confira os três idiomas; para preferências, confira a restauração após recarregar a página.

## Documentação atualizada

- Use Context7 MCP ao trabalhar com sintaxe, configuração, migração, integração ou depuração específica de bibliotecas, frameworks, SDKs, APIs, CLIs e serviços de nuvem.
- Comece por `resolve-library-id` com o nome e a pergunta, exceto quando houver um ID exato no formato `/org/project`.
- Selecione a correspondência mais relevante e confiável, usando uma versão específica quando solicitada; depois execute `query-docs` com a pergunta completa.
- Não é necessário consultar Context7 para refatorações puras, lógica de negócio, revisão de código ou conceitos gerais de programação.

## Comunicação

- Comunique-se em português, salvo solicitação diferente.
- Diferencie funcionalidades implementadas de propostas e registre limitações relevantes da simulação.
