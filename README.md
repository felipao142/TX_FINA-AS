# Caderneta

Controle financeiro pessoal que roda direto no navegador. Registre entradas e saídas, veja o saldo de cada mês e descubra para onde o dinheiro está indo.

Sem servidor, sem cadastro e sem dependências: os dados ficam salvos no `localStorage` do seu navegador.

## Funcionalidades

- Lançamentos de **entrada** e **saída** com descrição, valor, data e categoria
- Saldo do mês com barra que mostra a proporção entre entradas e saídas
- Navegação entre meses
- Resumo das saídas por categoria
- Editar e excluir lançamentos
- Exportar para **CSV** (abre no Excel e no Google Planilhas)
- **Backup e restauração** em JSON
- Tema claro e escuro automático, layout responsivo e navegação por teclado

## Como usar

Abra o arquivo `index.html` no navegador. Não precisa instalar nada.

Se preferir um servidor local:

```bash
python -m http.server 8000
# abra http://localhost:8000
```

## Estrutura

```
.
├── index.html   # estrutura da página
├── style.css    # estilos
├── app.js       # lógica (estado, renderização, exportação)
├── LICENSE
└── README.md
```

## Publicar no GitHub

```bash
git init
git add .
git commit -m "Primeira versão da Caderneta"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/caderneta.git
git push -u origin main
```

### Site online grátis (GitHub Pages)

1. No repositório, abra **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/ (root)`, e clique em **Save**.
4. Em um ou dois minutos o site fica em `https://SEU-USUARIO.github.io/caderneta/`.

## Detalhes técnicos

- Valores são guardados em **centavos (inteiros)** para evitar erros de arredondamento com decimais.
- Textos digitados são inseridos com `textContent`, sem `innerHTML`, para evitar injeção de HTML.
- O CSV protege contra injeção de fórmulas (textos que começam com `=`, `+`, `-` ou `@`).

## Ideias para evoluir

- Orçamento mensal por categoria
- Lançamentos recorrentes (aluguel, assinaturas)
- Gráfico de evolução do saldo ao longo dos meses
- Categorias personalizadas
- Instalação como PWA, para uso offline no celular

## Licença

[MIT](LICENSE)
