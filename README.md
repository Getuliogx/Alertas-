# Alerta de Filmes — GitHub Pages

Site estático para pesquisar filmes na TMDB e criar mensagens de alerta de conteúdo.

## Como publicar no GitHub Pages

1. Crie um repositório novo no GitHub.
2. Envie `index.html`, `style.css` e `app.js` para a raiz.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/ (root)`.
6. Salve. O GitHub mostrará o endereço do site.

## TMDB

Ao abrir o site, clique em **TMDB** e cole sua API Key v3.
A chave é salva com `localStorage` somente no navegador atual. Ela não fica escrita no repositório.

O site usa:
- `/search/movie`
- `/movie/{movie_id}`
- `append_to_response=keywords,release_dates`
- imagens em `image.tmdb.org`

## Importante sobre os alertas

A TMDB não é uma base dedicada de avisos de conteúdo cena por cena. O site usa gênero e palavras-chave como **sugestão automática**, além da classificação brasileira quando disponível. Revise os checkboxes antes de publicar o aviso.

## Créditos

Este produto usa a API da TMDB, mas não é endossado nem certificado pela TMDB.
