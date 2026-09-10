# Alerta de Filmes — versão de alta precisão

Frontend estático para GitHub Pages.

## O que mudou

A versão anterior tentava transformar palavras-chave da TMDB em avisos automáticos. Isso podia deixar passar nudez, gore, linguagem forte etc.

Esta versão separa os dados em três níveis:

- **Confirmado**: votação comunitária forte da fonte especializada.
- **Provável**: votação comunitária suficiente, mas menor.
- **Indício**: gênero, sinopse, palavras-chave ou resenhas da TMDB. Fica desmarcado por padrão.
- **Manual**: você pode adicionar/remover qualquer aviso.

A ideia é evitar dois problemas: inventar aviso que não existe e deixar um palpite da TMDB aparecer como se fosse certeza.

## Fontes

### TMDB
Necessária para pesquisa, pôster, título, sinopse, gêneros, classificação e palavras-chave.

A chave usa a mesma entrada de `localStorage` da versão anterior:

`tmdb_api_key_v3`

Se o site for publicado no mesmo domínio do GitHub Pages, o navegador normalmente continuará com a chave já salva.

### DoesTheDogDie
Opcional, mas recomendado para avisos detalhados. Cada visitante deve usar a própria chave.

A chave é salva apenas no navegador em:

`dttd_api_key_v3`

Não coloque a chave no código ou no repositório público.

O site procura diretamente pelo `tmdbId`, reduzindo o risco de misturar remakes ou filmes com o mesmo nome.

## Publicação

Substitua no seu repositório os arquivos:

- `index.html`
- `style.css`
- `app.js`

Depois aguarde o GitHub Pages atualizar.

## Observação

Nenhuma base de terceiros garante 100% de cobertura para todos os filmes. Por isso o site mostra a fonte e a força da evidência em vez de chamar inferências de "confirmadas".

Quando dados do DoesTheDogDie são exibidos, a atribuição exigida aparece na mesma interface:

`Powered by DoesTheDogDie.com`

O plano gratuito dessa API é destinado a uso não comercial e tem limites próprios.
