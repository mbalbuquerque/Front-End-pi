# Guia de uso do ColdTrack Control

## Introdução

O ColdTrack Control é um painel web para acompanhar a temperatura e a umidade de cargas refrigeradas em tempo real. Um sensor instalado no compartimento de carga envia as leituras pela internet, e o painel mostra a situação de cada veículo, avisa quando a temperatura sai da faixa da carga e gera relatórios.

Como usar este guia: procure a seção da tela que você está usando (Dashboard, Veículos, Sensores e assim por diante). Os nomes de botões, campos e mensagens aparecem exatamente como no painel. Cada empresa vê apenas os próprios dados.

O painel atualiza as telas sozinho a cada 20 segundos. Não é preciso recarregar a página.

## Perfis: gestor e operador

Existem dois perfis. O perfil aparece no menu lateral, abaixo do seu nome: **Gestor** ou **Operador logístico**.

**Operador logístico** acompanha a carga. Pode:
- ver Dashboard, Veículos, Sensores, Viagens, Alertas, Relatórios e Configurações;
- trocar de veículo, filtrar períodos e baixar o CSV dos relatórios;
- abrir e imprimir a **Etiqueta QR** de um veículo;
- trocar a própria senha.

**Gestor** faz tudo o que o operador faz e também administra a operação:
- **Veículos**: cadastrar (**Cadastrar veículo**) e remover (**Remover veículo**).
- **Sensores**: conectar sensor pelo cabo USB (**Conectar sensor pelo cabo**), **Registrar sem cabo**, **Gerar nova chave** e **Remover**.
- **Viagens**: **Registrar viagem**, **Encerrar viagem** e **Remover**.
- **Configurações**: painel **Usuários** (criar usuário, **Redefinir senha**, **Remover**).

Para o operador, esses controles simplesmente não aparecem. Se algo estiver faltando na sua tela, peça ao gestor da sua empresa.

## Início e login

**Página inicial.** É pública e apresenta o projeto, com as seções Início, Projeto, Diferencial, Quem somos e Contato. O botão **Entrar** leva ao login.

**Entrar.**
1. Abra a tela de login.
2. Digite o **E-mail** e a **Senha**. O botão **Mostrar** exibe a senha digitada; **Ocultar** volta a esconder.
3. Clique em **Entrar**. Você chega ao Dashboard.

Mensagens possíveis: "Informe um e-mail válido.", "Informe sua senha." e "Sem conexão com o servidor. Confira a internet e tente de novo."

**Esqueceu a senha?** O painel orienta: "Peça ao gestor da sua equipe para definir uma senha nova." O gestor faz isso em Configurações (veja a seção Configurações).

**Cadastrar empresa.** Na página inicial há o link "Empresa nova? Cadastre sua empresa". A tela **Cadastrar empresa** cria o acesso da transportadora e você entra como gestor. Preencha todos os campos:
- **Nome da empresa**
- **Seu nome**
- **E-mail**
- **Senha (mínimo 8 caracteres)**

Depois do cadastro você é levado direto à tela Sensores para conectar o primeiro sensor. Se faltar algum campo, aparece "Preencha todos os campos."

**Duração da sessão.** O login vale por 8 horas. Quando a sessão vence, o painel volta sozinho para a tela de login e você entra de novo. Para encerrar manualmente, use o botão **Sair** no rodapé do menu lateral.

**Menu lateral.** Dashboard, Veículos, Sensores, Viagens, Alertas, Relatórios e Configurações. No topo de cada tela há um indicador de conexão: "Conectando...", "Azure conectado" ou "Sem conexão com Azure". Se aparecer "Sem conexão com Azure", os dados voltam na próxima atualização (20 s).

## Dashboard

Título da tela: **Visão Geral** (Monitoramento da cadeia fria). Mostra o veículo escolhido.

**Cartões do topo:**
- **Temperatura atual**, com a frase de situação ("Temperatura dentro da faixa da carga", "Temperatura em atenção" ou "Temperatura crítica");
- **Umidade relativa**;
- **Sinal Wi-Fi**, em dBm, com a classificação: Sinal excelente (a partir de -60 dBm), Sinal bom (a partir de -70), Sinal regular (a partir de -80), Sinal fraco (abaixo disso) ou Sinal não informado;
- **Status da carga**: NORMAL, ATENÇÃO, CRÍTICO ou AGUARDANDO (quando ainda não há dados).

**Monitoramento em tempo real.** Mostra o **VEÍCULO**, a **CARGA** (perfil e faixa normal, por exemplo "normal de 10 a 13 °C") e o **SENSOR** (ID do sensor). Abaixo, o **Histórico de temperatura** é um gráfico dos últimos 30 minutos, a partir da leitura mais recente, com a faixa normal destacada e os limites de Atenção e Crítico.

**Última telemetria.** Temperatura, Umidade, RSSI e Atualização (data e hora da leitura). Quando a leitura sai da faixa normal, aparece o aviso "Alerta de temperatura: a temperatura da carga está fora da condição normal."

**Escolher veículo.** Com mais de um veículo cadastrado, aparece o seletor **Veículo** no topo. A escolha é lembrada nas telas Dashboard, Alertas e Relatórios.

**Abrir um veículo direto.** O endereço do painel aceita `?veiculo=<código>`, por exemplo `/dashboard?veiculo=CT-002`. É o que a etiqueta QR usa. O botão **Ver no painel**, na tela Veículos, faz o mesmo.

**Calor na rota.** Painel com a previsão de temperatura para as próximas 24 horas na rota Petrolina a Suape. Cada hora mostra a máxima entre as cidades da rota. As cores indicam: até 30 °C, acima de 30 °C e acima de 35 °C. O painel também indica a janela mais fresca (três horas) para carregar em Petrolina e cita o histórico do mês. A previsão é atualizada a cada 30 minutos. Se não carregar, aparece "A previsão do dia não carregou. Mostrando só o histórico."

**Se o Dashboard estiver vazio:**
- "Nenhum veículo cadastrado." Registre o sensor em Sensores e depois cadastre o veículo em Veículos.
- "O sensor ... ainda não enviou leituras." Ligue o sensor e confira o Wi-Fi: a primeira leitura aparece em até 20 s.
- "Não foi possível carregar a telemetria." Falha de comunicação; os dados voltam na próxima atualização.

## Veículos

Mostra um cartão por veículo, com:
- código e tipo;
- selo de situação (NORMAL, ATENÇÃO, CRÍTICO, SEM DADOS ou SEM SINAL);
- **Temperatura** e **Umidade** da última leitura;
- **Última comunicação** (data e hora, "sem sinal há ..." ou "nunca enviou dados");
- **Perfil da carga** com a faixa normal, **Dispositivo** e **ID do sensor**.

Botões do cartão: **Ver no painel**, **Etiqueta QR** e, só para o gestor, **Remover veículo**.

### Cadastrar veículo (gestor)

Antes de cadastrar, o sensor precisa estar registrado em Sensores. Se não houver sensor livre, a tela avisa: "Nenhum sensor livre para um veículo novo."

1. Abra o painel **Cadastrar veículo**.
2. Preencha **Código** (exemplo: CT-002) e **Tipo** (exemplo: Caminhão baú refrigerado).
3. Em **Sensor**, escolha um dos sensores que ainda não têm veículo.
4. Opcional: **Dispositivo** (exemplo: ESP32-C3 + DHT11).
5. Em **Perfil da carga**, escolha o perfil. Cada opção mostra a faixa normal, por exemplo "(normal de 10 a 13 °C)".
6. Clique em **Cadastrar**.

O perfil define as faixas de temperatura do veículo (veja a seção Faixas por carga).

### Remover veículo (gestor)

Clique em **Remover veículo** e confirme. O painel avisa: "As leituras do sensor continuam guardadas."

### Etiqueta QR

A etiqueta é para colar no baú do veículo.
1. No cartão do veículo, clique em **Etiqueta QR**.
2. Abre uma janela com o QR code, o código do veículo e o texto "ColdTrack · aponte a câmera para ver a temperatura da carga".
3. Clique em **Imprimir** para imprimir só a etiqueta, ou em **Fechar**.

Ao apontar a câmera para o QR, abre-se o painel já no Dashboard daquele veículo. Quem escaneia precisa entrar com login: a etiqueta não dá acesso sozinha.

## Sensores

A tela lista os **Sensores registrados** e se atualiza sozinha a cada 20 s. Colunas: **ID**, **Descrição**, **Veículo** (ou "nenhum"), **Situação**, **Sinal Wi-Fi**, **Última temperatura**. O gestor vê também os botões **Gerar nova chave** e **Remover**.

**Situação** pode ser:
- **ONLINE**: o sensor enviou dados no último minuto;
- **SEM SINAL HÁ ...**: passou de 60 s sem leitura (veja a seção "Sem sinal");
- **NUNCA ENVIOU**: o sensor foi registrado, mas ainda não mandou nenhuma leitura.

Depois de conectar o sensor, ligue-o a um veículo em **Veículos**.

### Conectar um sensor pelo cabo USB (gestor)

O painel **Conectar sensor pelo cabo** reconhece o sensor, registra na sua empresa e grava nele a rede Wi-Fi.

Requisitos:
- usar o painel no **Chrome ou Edge, no computador**. No celular, Firefox e Safari não funciona; nesse caso o painel avisa "Este navegador não conversa com o cabo USB.";
- conta de **gestor**;
- rede Wi-Fi na banda de **2.4 GHz** (hotspot do celular ou Wi-Fi do local). No iPhone, ative "Maximizar compatibilidade";
- um cabo USB de dados (alguns cabos só carregam);
- sensor com o firmware ColdTrack gravado.

Passo a passo:
1. Ligue o sensor no computador pelo cabo USB.
2. Clique em **Conectar sensor pelo cabo** e escolha a porta do sensor na janela que o navegador abre.
3. O painel mostra **SENSOR RECONHECIDO** com o ID e o firmware, e explica o que vai acontecer:
   - sensor novo: "será registrado na sua empresa com este ID" (há o campo opcional **Descrição**);
   - sensor já da empresa e configurado: "continua com a mesma chave. Informe só a rede nova.";
   - sensor registrado sem chave gravada: uma chave nova será gerada, e a anterior para de valer.
4. Digite o **Nome da rede Wi-Fi** (até 32 caracteres) e a **Senha da rede** (até 63 caracteres; para rede aberta, deixe em branco; com senha, mínimo de 8 caracteres). A caixa "Mostrar a senha" ajuda a conferir.
5. Clique em **Conectar sensor** (ou **Trocar rede**, se o sensor já era da empresa). O sensor testa a rede por até 15 s antes de gravar.
6. Aparece **CONECTADO** e "Aguardando a primeira leitura chegar no Azure...". Quando a leitura chega, o painel mostra **ONLINE** com a temperatura.
7. Pode tirar o sensor do computador e ligar em um carregador: ele lembra da rede.
8. Para outro sensor, clique em **Conectar outro sensor**. Em **Veículos**, ligue o sensor ao veículo.

A rede e a senha vão direto para o sensor pelo cabo; não são guardadas pelo painel.

Se der errado, o painel mostra mensagens como:
- "Senha errada para a rede ...": confira maiúsculas e minúsculas. Nada é gravado quando a rede falha; o sensor continua na rede anterior.
- "O sensor não achou a rede ...": confira o nome exato e se o hotspot está ligado em 2.4 GHz.
- "O sensor não conseguiu entrar na rede ... em 15 s": confira nome, senha, banda 2.4 GHz e deixe o celular perto do sensor.
- "O sensor não respondeu. Confira se ele está com o firmware ColdTrack atualizado.": use um cabo de dados, feche a Arduino IDE e outras abas que usem o sensor, e confirme que o firmware ColdTrack está gravado (com "USB CDC On Boot" ligado na Arduino IDE).
- "O cabo foi desconectado...": ligue o sensor de novo e clique em **Conectar sensor pelo cabo**.
- "O sensor ... está registrado em outra empresa.": peça para essa empresa remover o sensor antes.
- "O sensor entrou na rede, mas nenhuma leitura chegou em 2 min.": confira se a rede tem internet (o hotspot precisa de dados móveis). Se o sensor foi removido ou ganhou chave nova, conecte pelo cabo de novo.

Para trocar de rede (por exemplo, de casa para o celular), ligue o sensor no cabo e conecte de novo: o painel reconhece o sensor e pede só a rede nova. Há também a seção **Como conectar um sensor** na própria tela, com esses passos.

### Chave do sensor

Cada sensor tem uma chave própria, que é o que autoriza o envio de dados. A chave aparece uma única vez: o painel mostra o aviso "Copie agora: a chave não aparece de novo." junto com as linhas `DEVICE_ID` e `DEVICE_KEY` prontas para o arquivo `secrets.h`. Use **Copiar** para copiar e **Já copiei** para fechar.

Quando conectar pelo cabo, a chave é gravada no sensor automaticamente.

**Gerar nova chave** (gestor): a chave atual para de funcionar na hora e o sensor precisa ser conectado de novo pelo cabo. O painel pede confirmação.

**Remover** (gestor): o sensor deixa de enviar dados; as leituras já gravadas continuam guardadas.

### Registrar sem cabo (gestor)

Painel pensado para o simulador Wokwi ou para gravar o sensor pela Arduino IDE. Preencha **ID do sensor** (exemplo: coldtrack-02) e **Descrição** e clique em **Registrar sensor**. O painel mostra o ID e a chave para colar no `secrets.h`. Com o sensor em mãos, prefira **Conectar sensor pelo cabo**.

## Viagens

Mostra a condição da carga do início ao fim de cada trajeto. As viagens em andamento aparecem primeiro, depois as mais recentes.

Cada viagem mostra:
- código, veículo e carga;
- selo **EM ANDAMENTO** ou **CONCLUÍDA**;
- origem e destino;
- **Início** e **Em viagem há** (ou **Duração**, quando concluída);
- **Faixa registrada**: menor e maior temperatura no trajeto;
- **Tempo fora da faixa**: soma das ocorrências fora da faixa normal, ou "nenhum";
- gráfico de temperatura do trajeto.

Se o veículo da viagem foi removido, aparece "O veículo ... não está mais cadastrado."

A rota real no mapa está marcada como **PLANEJADO**: chega com o módulo 4G com GPS no caminhão.

### Registrar viagem (gestor)

É preciso ter ao menos um veículo cadastrado ("Cadastre um veículo antes de registrar viagens.").
1. Abra o painel **Registrar viagem**.
2. Escolha o **Veículo**.
3. Preencha **Origem** (exemplo: Petrolina/PE), **Destino**, **Carga** (exemplo: Manga Tommy Atkins) e **Início** (já vem com a data e hora atuais).
4. Clique em **Registrar**.

### Encerrar e remover (gestor)

- **Encerrar viagem**: aparece nas viagens em andamento; confirma e marca o fim como agora.
- **Remover**: apaga a viagem. As leituras do sensor continuam guardadas.

## Alertas

Lista as leituras fora da faixa normal da carga do veículo escolhido. Leituras seguidas fora da faixa viram uma **ocorrência**; se o sensor ficar mais de 3 envios (60 s) sem leitura, a ocorrência é encerrada.

Use o filtro **Últimas 24 h** ou **Últimos 7 dias**.

Cartões de resumo:
- **Ocorrências**: quantidade no período;
- **Críticas**: ocorrências em nível crítico (o cartão mostra a regra do crítico);
- **Pico registrado**: a temperatura mais distante da faixa normal;
- **Última ocorrência**: dia/mês e hora do início.

Tabela **Ocorrências de temperatura**: **Nível** (ATENÇÃO ou CRÍTICO; vale CRÍTICO se qualquer leitura da ocorrência foi crítica), **Início**, **Duração**, **Pico** e **Leituras**.

Sem alertas, aparece "Nenhum alerta nas últimas 24 h." com a faixa normal da carga.

## Relatórios

Resumo da temperatura por período do veículo escolhido.

**Período.** Escolha **Últimas 24 h** ou **Últimos 7 dias**. O relatório usa até 500 leituras; quando chega a esse limite, o painel avisa "Mostrando as 500 leituras mais recentes do período."

**Cartões:** **Leituras**, **Temperatura média** (com mínima e máxima), **Fora da faixa normal** (percentual e quantidade de leituras) e **Críticas**.

**Gráfico** "Temperatura no período": a faixa azul é a faixa normal da carga.

**Tabela Leituras**, da mais recente para a mais antiga: **Medido em**, **Temperatura**, **Umidade** e **Status**.

**Baixar CSV.** O botão **Baixar CSV** gera um arquivo com as leituras mostradas. O nome segue o modelo `coldtrack-<veículo>-24h.csv` (ou `-168h.csv` para 7 dias). Os campos são separados por ponto e vírgula e o arquivo abre no Excel com acentos corretos. Colunas:

`medido_em;temperatura_c;umidade_pct;rssi_dbm;status`

Sem leituras no período, aparece "Nenhuma leitura nas últimas 24 h." (ou "nos últimos 7 dias") e a orientação "Confira se o sensor está ligado e conectado."

## Configurações

A tela reúne:

**Minha conta.** Mostra seu nome, e-mail e empresa. Para trocar a senha:
1. Digite a **Senha atual**.
2. Digite a **Nova senha (mín. 8)**.
3. Clique em **Trocar senha**.

Depois da troca aparece "Senha trocada. Os outros aparelhos conectados saem da conta." Você continua conectado neste aparelho.

**Faixas de temperatura.** Tabela com **Perfil de carga**, **Normal**, **Atenção** e **Crítico** de cada perfil (veja a próxima seção).

**Sensores e comunicação.** Quantidade de sensores registrados, intervalo de envio (20 s), acesso por chave própria e o fato de o sensor guardar leituras sem sinal (até 500 na memória do sensor).

**Fonte de dados.** De onde o painel lê a telemetria, a frequência de atualização (a cada 20 s) e o aviso de que cada empresa vê só os próprios dados.

**Usuários (somente gestor).** Lista nome, e-mail e perfil de quem acessa a empresa.
- **Criar usuário**: preencha **Nome**, **E-mail**, **Perfil** (**Operador logístico** ou **Gestor**) e **Senha inicial (mín. 8)** e clique em **Criar usuário**.
- **Redefinir senha**: abre uma janela para definir uma **Nova senha (mín. 8)**. A pessoa sai de todos os aparelhos e entra com a senha nova. Use quando alguém esquecer a senha.
- **Remover**: retira o acesso da pessoa, após confirmação.
- Na sua própria linha aparece "você", sem botões.

## Faixas por carga: Normal, Atenção e Crítico

Cada veículo tem um **perfil de carga**. Cada perfil define:
- um limite **máximo** de temperatura;
- opcionalmente um limite **mínimo** (cargas sensíveis ao frio demais);
- uma **margem**, em graus.

A classificação de cada leitura segue esta regra:

- **Normal**: a temperatura está dentro da faixa, entre o mínimo e o máximo. Sem mínimo, vale "até" o máximo.
- **Atenção**: a temperatura saiu da faixa normal em até a margem, para cima ou para baixo.
- **Crítico**: a temperatura passou da margem: acima de máximo + margem, ou abaixo de mínimo - margem.

Como o painel descreve isso:
- Normal: "de 10 a 13 °C" (com mínimo e máximo) ou "até 15 °C" (só máximo);
- Crítico: "acima de 20 °C" (só máximo) ou "abaixo de 7 °C ou acima de 16 °C" (com mínimo e máximo).

Exemplo (perfil com mínimo 10, máximo 13 e margem 3):
- de 10 a 13 °C: Normal;
- de 7 a menos de 10 °C, ou mais de 13 até 16 °C: Atenção;
- abaixo de 7 °C ou acima de 16 °C: Crítico.

Exemplo do perfil demonstrativo (usado enquanto os perfis não carregam): Normal até 15 °C, Atenção até 20 °C (margem de 5 °C) e Crítico acima de 20 °C.

Frio demais também conta: abaixo da faixa a fruta pode sofrer dano por frio. As faixas de manga e uva são de referência de pós-colheita, ainda a validar com o produtor. O sensor DHT11 não mede abaixo de 0 °C; para cargas que exigem isso, o painel recomenda DHT22 ou sonda DS18B20.

A mesma regra vale no sensor (LED), na nuvem e no painel. A tabela completa de perfis está em **Configurações**, em **Faixas de temperatura**. A faixa é escolhida ao cadastrar o veículo, no campo **Perfil da carga**.

## Sem sinal

Em **Veículos** e **Sensores**, "sem sinal" significa que o sensor está há mais de 60 segundos sem enviar leitura (mais de 3 envios; o sensor envia a cada 20 s).

Como aparece:
- Veículos: selo **SEM SINAL** e, em **Última comunicação**, "sem sinal há ..." (por exemplo, "sem sinal há 12 min").
- Sensores: na coluna **Situação**, **SEM SINAL HÁ ...**, com o horário do último envio.
- **NUNCA ENVIOU** (Sensores) ou "nunca enviou dados" (Veículos): o sensor foi registrado, mas nunca mandou leitura.
- Dashboard: **AGUARDANDO** e "Aguardando dados" enquanto não há leitura.

O que fazer, em ordem:
1. Confira se o sensor está ligado (alimentado por carregador ou cabo USB).
2. Confira o Wi-Fi: a rede precisa estar disponível, em 2.4 GHz e com internet (hotspot do celular precisa de dados móveis). No Dashboard, o **Sinal Wi-Fi** "fraco" indica sensor longe do roteador ou celular.
3. Se a rede mudou, conecte o sensor de novo pelo cabo USB, informando a rede nova (veja Sensores).
4. Se o sensor foi removido ou ganhou **Gerar nova chave**, ele para de enviar: conecte-o pelo cabo para gravar a chave nova.
5. Confira o ID do sensor em **Sensores** e se ele está ligado ao veículo certo em **Veículos**.
6. Aguarde até 20 s para a primeira leitura aparecer depois de ligar.

Boa notícia: enquanto o sensor está sem sinal, ele guarda as leituras na memória (até 500) e as envia quando a conexão volta. Por isso o gráfico e os relatórios usam o horário em que a leitura foi medida, e não o de chegada.

## Assistente do painel

Em todas as telas depois do login existe um botão flutuante **Assistente**, no canto inferior direito. Ao clicar, abre uma conversa em que você pode perguntar:
- como usar o painel (por exemplo, "como cadastro um veículo?");
- sobre os dados da sua empresa: veículos, sensores, últimas leituras, alertas das últimas 24 h e viagens.

Como usar:
1. Clique em **Assistente**. A conversa abre com uma saudação pelo seu primeiro nome. No celular, ela ocupa a largura toda da tela.
2. Escolha uma das sugestões (**Como estão meus veículos agora?**, **Teve alerta nas últimas 24 h?**, **Como cadastro um sensor?**, **O que o operador pode fazer?**) ou digite a pergunta (até 500 caracteres) e tecle Enter ou clique em **Enviar**.
3. Enquanto a resposta não chega, aparece "Assistente digitando…" e o campo fica bloqueado. A resposta costuma levar alguns segundos.
4. Abaixo da resposta, a linha **Fontes** diz de onde a informação veio.
5. Para fechar, clique no **×** ou tecle Esc. A conversa continua lá se você trocar de tela.

O assistente lembra das últimas mensagens da conversa, então dá para fazer perguntas de continuação ("e ontem?"). As respostas são geradas automaticamente: confira os números nas telas do painel antes de tomar uma decisão.

Pontos importantes:
- o assistente apenas consulta: ele **não altera dados**. Cadastros, remoções e ajustes continuam sendo feitos nas telas do painel;
- a conversa é mantida somente enquanto você está logado e é apagada quando você sai (**Sair**) ou a sessão vence;
- se o serviço estiver fora do ar, aparece "O assistente está indisponível agora. Tente de novo em instantes.";
- há um limite de perguntas em sequência: se aparecer a mensagem de "muitas perguntas seguidas", aguarde cerca de 1 minuto e pergunte de novo.

## Perguntas frequentes

**Entrei e não vejo os botões de cadastrar veículo, viagem ou sensor. Por quê?**
Esses controles são do perfil Gestor. Operadores acompanham a carga, mas não cadastram. Peça ao gestor da sua empresa.

**Esqueci minha senha. Como recupero?**
Na tela de login, "Esqueceu a senha?" orienta a pedir ao gestor uma senha nova. O gestor usa **Redefinir senha** em Configurações, no painel Usuários. Se você consegue entrar e só quer trocar, use **Trocar senha** em Minha conta.

**O painel me levou de volta ao login sozinho. O que houve?**
A sessão dura 8 horas. Ao vencer, é preciso entrar de novo.

**O veículo aparece como SEM SINAL. A carga está em risco?**
O painel não está recebendo leituras há mais de 60 s, então a temperatura atual é desconhecida. Siga a checklist da seção "Sem sinal". O sensor guarda as leituras do período sem conexão e as envia quando voltar.

**Qual a diferença entre Atenção e Crítico?**
Atenção é uma saída pequena da faixa normal (até a margem do perfil). Crítico é uma saída maior que a margem. Veja "Faixas por carga".

**Como imprimo a etiqueta QR do veículo?**
Em **Veículos**, clique em **Etiqueta QR** no cartão do veículo e depois em **Imprimir**. Quem escanear precisa fazer login para ver os dados.

**O botão "Conectar sensor pelo cabo" não funciona.**
Use o Chrome ou o Edge no computador, com a conta de gestor, e um cabo USB de dados. Em celular, Firefox e Safari essa função não está disponível. Para o simulador, use **Registrar sem cabo**.

**Perdi a chave de um sensor. E agora?**
A chave não aparece de novo. Use **Gerar nova chave** na linha do sensor (a anterior para de valer) e conecte o sensor pelo cabo USB para gravar a nova.

**Como levo os dados para uma planilha?**
Em **Relatórios**, escolha o veículo e o período e clique em **Baixar CSV**.
