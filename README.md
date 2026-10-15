# Siga

Área do encarregado de educação, com interface própria para telemóvel. Os dados e as operações vêm de [siga.edubox.pt](https://siga.edubox.pt): esta aplicação faz de proxy, não guarda a palavra-passe.

## Arrancar

```bash
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:3000` e entre com o utilizador e a palavra-passe do SIGA.

## O que faz

- Entrar, primeiro acesso, recuperar e redefinir a palavra-passe
- Vídeos e documentos oficiais
- Depois do login, abre o portal da escola devolvido pelo SIGA e lê os módulos: início, área pessoal, candidaturas, cartão, ementas, marcações, notificações, pagamentos e portaria
- Se o portal expuser os dias de marcação ou o carregamento do cartão, esses pedidos também seguem para lá

O link de recuperação que chega por email abre o site oficial. O código desse link pode ser colado em “Tenho um código”.
