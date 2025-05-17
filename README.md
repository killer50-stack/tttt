# Sistema de Upload de Vídeos

Um sistema completo de upload de vídeos com interface moderna, desenvolvido com HTML, CSS, JavaScript e Node.js.

## Funcionalidades

- Upload de vídeos com limite de 3GB por arquivo
- Limite total de armazenamento de 999GB
- Validação de tipo e tamanho de arquivo
- Interface com tema escuro
- Barra de progresso durante upload
- Listagem e visualização de vídeos
- Exclusão de vídeos

## Requisitos

- Node.js 14.x ou superior
- NPM 6.x ou superior

## Instalação

1. Clone o repositório ou extraia os arquivos para uma pasta

2. Instale as dependências:
```bash
npm install
```

## Configuração

Os arquivos estão organizados da seguinte forma:

- `server.js` - Servidor Node.js
- `public/` - Arquivos frontend (HTML, CSS, JS)
- `uploads/` - Pasta onde os vídeos serão salvos (criada automaticamente)

## Uso

1. Inicie o servidor:
```bash
npm start
```

2. Para desenvolvimento (reinicia automaticamente quando há mudanças):
```bash
npm run dev
```

3. Acesse a aplicação pelo navegador:
```
http://localhost:3000
```

## Estrutura de arquivos

```
.
├── server.js
├── package.json
├── public/
│   ├── index.html
│   ├── script.js
│   └── style.css
└── uploads/ (criada automaticamente)
```

## Configurações personalizadas

Para alterar a porta ou limites de tamanho, edite as constantes no início do arquivo `server.js`.

## Observações

- Os uploads são persistentes e ficam salvos na pasta `uploads/`
- Todas as validações são feitas tanto no cliente quanto no servidor 