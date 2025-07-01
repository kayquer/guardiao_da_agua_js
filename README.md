# 💧 Guardião da Água

**Jogo educacional de simulação e gerenciamento de recursos hídricos**

Um jogo web interativo desenvolvido para ensinar sobre conservação da água, gestão sustentável e responsabilidade ambiental através de mecânicas de simulação urbana.

## 🎮 Sobre o Jogo

O **Guardião da Água** é um jogo educacional onde você assume o papel de gestor municipal responsável pelos recursos hídricos de uma cidade em crescimento. Sua missão é garantir que todos os habitantes tenham acesso à água limpa e segura, enquanto mantém o equilíbrio ambiental e econômico.

### 🎯 Objetivos Educacionais

- **Conservação da Água**: Aprenda sobre a importância da preservação dos recursos hídricos
- **Gestão Sustentável**: Entenda como equilibrar crescimento urbano com proteção ambiental
- **Responsabilidade Ambiental**: Descubra o impacto das decisões humanas no meio ambiente
- **Planejamento Urbano**: Desenvolva habilidades de gestão e tomada de decisão estratégica

### 🏗️ Mecânicas Principais

- **Sistema de Construção**: Construa infraestrutura hídrica (bombas, estações de tratamento, reservatórios)
- **Gerenciamento de Recursos**: Monitore água, poluição, população e orçamento
- **Missões Educacionais**: Complete objetivos específicos para aprender conceitos importantes
- **Eventos Dinâmicos**: Enfrente desafios como secas, enchentes e vazamentos
- **Progressão**: Desbloqueie novas tecnologias e estruturas conforme avança

## 🚀 Como Executar

### Requisitos

- **Navegador Moderno**: Chrome, Firefox, Safari ou Edge (versões recentes)
- **WebGL**: Suporte a WebGL para renderização 3D
- **JavaScript**: Habilitado no navegador
- **Resolução**: Mínima de 1024x768 (responsivo para mobile)

### Instalação

1. **Clone ou baixe o projeto**:
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd guardiao_da_agua_js
   ```

2. **Abra o arquivo principal**:
   - Abra o arquivo `index.html` diretamente no navegador, OU
   - Use um servidor local (recomendado para melhor performance)

### Servidor Local (Recomendado)

Para melhor performance e funcionalidade completa, execute com um servidor local:

#### Opção 1: Python
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Opção 2: Node.js
```bash
# Instalar http-server globalmente
npm install -g http-server

# Executar servidor
http-server -p 8000
```

#### Opção 3: PHP
```bash
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

## 🎮 Como Jogar

### 1. **Tutorial Interativo**
- Clique em "Tutorial" no menu principal
- Siga as instruções passo a passo
- Aprenda os conceitos básicos de forma guiada

### 2. **Controles Básicos**
- **Mouse**: Navegue pela câmera e selecione objetos
- **Clique**: Selecione edifícios ou posicione construções
- **Scroll**: Zoom in/out na câmera
- **Teclas 1-3**: Altere a velocidade do jogo
- **Espaço**: Pause/resume o jogo
- **ESC**: Sair do modo construção

### 3. **Interface**
- **Painel Superior**: Recursos (água, poluição, população, satisfação, orçamento)
- **Painel Esquerdo**: Menu de construção por categorias
- **Painel Direito**: Informações detalhadas
- **Painel Inferior**: Missões atuais e notificações

### 4. **Estratégias**
- **Comece Pequeno**: Construa uma bomba de água básica
- **Trate a Poluição**: Use estações de tratamento
- **Armazene Água**: Construa reservatórios para emergências
- **Monitore Recursos**: Mantenha equilíbrio entre produção e consumo
- **Complete Missões**: Siga os objetivos para progredir

## 🏗️ Estrutura do Projeto

```
guardiao_da_agua_js/
├── index.html              # Arquivo principal
├── css/                    # Estilos
│   ├── styles.css         # Estilos principais
│   ├── ui.css             # Interface do jogo
│   └── responsive.css     # Responsividade
├── js/                    # JavaScript
│   ├── main.js           # Arquivo principal
│   ├── core/             # Classes principais
│   │   ├── GameManager.js
│   │   ├── GridManager.js
│   │   └── ResourceManager.js
│   ├── systems/          # Sistemas do jogo
│   │   ├── BuildingSystem.js
│   │   ├── UIManager.js
│   │   ├── QuestSystem.js
│   │   ├── EventSystem.js
│   │   ├── SaveSystem.js
│   │   └── TutorialManager.js
│   └── utils/            # Utilitários
│       ├── AssetLoader.js
│       └── AudioManager.js
├── Sprites/              # Assets visuais
├── Sounds/               # Assets de áudio
└── UI/                   # Elementos de interface
```

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura e Canvas
- **CSS3**: Estilos e animações responsivas
- **JavaScript ES6+**: Lógica do jogo (orientado a objetos)
- **Babylon.js**: Renderização 3D e física
- **Web Audio API**: Sistema de som
- **localStorage**: Persistência de dados

## 📱 Compatibilidade

### Desktop
- **Chrome**: ✅ Totalmente suportado
- **Firefox**: ✅ Totalmente suportado
- **Safari**: ✅ Suportado (macOS)
- **Edge**: ✅ Totalmente suportado

### Mobile
- **iOS Safari**: ✅ Suportado com interface adaptada
- **Android Chrome**: ✅ Suportado com interface adaptada
- **Outros navegadores mobile**: ⚠️ Funcionalidade limitada

### Requisitos Mínimos
- **RAM**: 2GB
- **Processador**: Dual-core 2GHz
- **GPU**: Suporte a WebGL
- **Conexão**: Não necessária (após carregamento inicial)

## 🎓 Conteúdo Educacional

### Conceitos Abordados
- **Ciclo da Água**: Como a água circula na natureza
- **Tratamento de Água**: Processos de purificação e filtração
- **Conservação**: Técnicas de economia e reutilização
- **Poluição Hídrica**: Causas e consequências da contaminação
- **Gestão Urbana**: Planejamento de infraestrutura sustentável

### Fatos Educacionais
- Dados reais sobre consumo de água
- Estatísticas de acesso global à água potável
- Impactos ambientais da má gestão hídrica
- Tecnologias sustentáveis de tratamento

## 🔧 Desenvolvimento

### Arquitetura
- **Padrão MVC**: Separação clara entre lógica, dados e interface
- **Orientação a Objetos**: Classes modulares e reutilizáveis
- **Sistema de Eventos**: Comunicação entre componentes
- **Gerenciamento de Estado**: Controle centralizado do jogo

### Performance
- **60 FPS**: Otimizado para 60 quadros por segundo
- **Culling**: Renderização apenas de objetos visíveis
- **Pool de Objetos**: Reutilização de recursos
- **Compressão**: Assets otimizados para web

## 📄 Licença

Este projeto é desenvolvido para fins educacionais. Os assets utilizados podem ter licenças específicas - consulte as pastas de recursos para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

## 📞 Suporte

Para dúvidas, problemas ou sugestões:
- Abra uma issue no repositório
- Consulte a documentação no código
- Verifique os logs do console do navegador

---

**🌊 Seja um verdadeiro Guardião da Água e ajude a construir um futuro sustentável!**
