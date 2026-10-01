# Testes

Rodam o placar num navegador de mentira (jsdom). Não precisam de
internet nem do Supabase: o banco é simulado dentro do arquivo.

```bash
npm install jsdom        # uma vez só
node testes/placar.js
```

Cobre: a separação do app (nenhum resquício de grupo ou do banco
antigo), a contagem de beach tennis incluindo quarentão e tiebreak,
o overlay desenhando em 1920×1080, a fila da quadra, as logos, e o
painel de controle no computador com os atalhos de teclado.

Termina em `✓ TUDO OK` ou `✗ N FALHA(S)`, e sai com código 1 quando
falha — serve em automação.
