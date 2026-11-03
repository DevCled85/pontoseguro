# ⏱️ PontoSeguro - Auditor de Ponto e Canhotos com IA & Firebase

Sistema moderno, responsivo e seguro para registro, auditoria e preservação de comprovantes impressos de ponto eletrônico (REP - Portaria 671 MTE), projetado para o trabalhador **Cledson do Nascimento Pereira** (**Vidronox**).

---

## 🚀 Como Enviar para o seu GitHub e Publicar no GitHub Pages

O projeto já está com Git inicializado, todos os arquivos commitados na branch `main` e um fluxo de automação do **GitHub Actions** configurado em `.github/workflows/deploy.yml`.

### Passo 1: Criar o Repositório no GitHub
1. Acesse sua conta no [GitHub](https://github.com).
2. Clique no botão verde **"New"** (ou **"Novo Repositório"**).
3. Dê o nome que desejar, por exemplo: `pontoseguro`.
4. Deixe como **Public** ou **Private** e **NÃO** marque a opção de adicionar README nem .gitignore (pois já temos tudo pronto aqui).
5. Clique em **"Create repository"**.

### Passo 2: Conectar e Enviar os Arquivos (Push)
No seu terminal ou console de comando:
```bash
# 1. Adicione o endereço do seu repositório criado (substitua com seu usuário e nome do repo):
git remote add origin https://github.com/SEU_USUARIO_GITHUB/pontoseguro.git

# 2. Envie os arquivos para o GitHub:
git push -u origin main
```

*(Caso use chave de acesso pessoal / Personal Access Token do GitHub, insira-a quando o terminal solicitar a senha).*

---

## 🌐 Passo 3: Ativar o GitHub Pages em 1 Minuto

Depois de enviar os arquivos para o GitHub:

1. Abra a página do seu repositório no GitHub.
2. Clique na aba superior **"Settings"** (Configurações).
3. No menu lateral esquerdo, clique em **"Pages"**.
4. Na seção **"Build and deployment"** > **"Source"**, selecione:
   👉 **GitHub Actions**
5. O GitHub executará automaticamente o workflow `.github/workflows/deploy.yml` e publicará seu site em:
   `https://SEU_USUARIO_GITHUB.github.io/pontoseguro/`

Você poderá abrir esse link no seu celular ou computador sempre que quiser!

---

## ✨ Funcionalidades Principais

- 🔒 **Proteção por PIN:** Acesso protegido por PIN configurado (`9655`).
- 🤖 **Leitura Automática por IA (Google Gemini):** Escaneia comprovantes térmicos de ponto para extrair horários de entrada, almoço, retorno, saída e NSR.
- ☁️ **Sincronização em Nuvem (Firebase Firestore):** Salva os registros e fotos com backup no Firebase, garantindo que você nunca perca seus registros caso troque de aparelho.
- 📅 **Calendário Interativo:** Visualize rapidamente os dias trabalhados e batidas registradas.
- 📊 **Auditoria & Relatórios para o RH:** Exportação de comprovantes e conferência caso haja inconsistências de horas.
- 📱 **100% Responsivo & PWA Ready:** Otimizado para celular com suporte para salvar na tela de início.

---

## 💡 Dica para o GitHub Pages (Uso no Celular)

- Como o GitHub Pages é uma hospedagem estática (sem backend Node.js), a conexão com o **Firebase Firestore** funciona diretamente pelo navegador.
- Para usar o **escaneamento de comprovante com IA** diretamente no GitHub Pages:
  1. No sistema, clique no ícone de **Configurações (⚙️)**.
  2. Insira sua chave gratuita da API Gemini do Google ([Google AI Studio](https://aistudio.google.com/app/apikey)).
  3. Ela ficará salva no seu celular/navegador com total privacidade!
