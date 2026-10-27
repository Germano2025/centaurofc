#!/usr/bin/env bash
set -e

REPO_HOST="github.com/Germano2025/centauro.git"

# 1. Obter o token de autenticação
TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$TOKEN" ] && [ -f ".github_token" ]; then
  TOKEN=$(cat .github_token | tr -d ' \n\r\t')
fi

if [ -z "$TOKEN" ] && [ -f ".env" ]; then
  TOKEN=$(grep "^GITHUB_TOKEN=" .env 2>/dev/null | cut -d '=' -f2- | tr -d ' "\r\n')
fi

# Garantir que o repositório git está inicializado antes de configurar
if [ ! -d ".git" ]; then
  git init
fi

# Configurar git com o e-mail do proprietário da conta Vercel
git config user.name "Américo Germano"
git config user.email "americogermano777@gmail.com"
git branch -M main 2>/dev/null || true

# Configurar remote origin
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "https://github.com/Germano2025/centaurofc.git"
else
  git remote set-url origin "https://github.com/Germano2025/centaurofc.git"
fi

# Adicionar todas as alterações
git add -A

# Verificar se há alterações para commit
if git diff --cached --quiet; then
  CURRENT_AUTHOR=$(git log -1 --pretty=format:'%ae' 2>/dev/null || echo "")
  if [ "$CURRENT_AUTHOR" != "americogermano777@gmail.com" ]; then
    git commit --amend --author="Américo Germano <americogermano777@gmail.com>" --no-edit
    echo "✓ Autor do último commit alinhado com a Vercel: Américo Germano <americogermano777@gmail.com>"
  else
    echo "✓ Repositório local já está limpo e sem modificações pendentes."
  fi
else
  COMMIT_MSG="${1:-Atualização do Centauro Gestão - $(date '+%d/%m/%Y %H:%M:%S')}"
  git commit --author="Américo Germano <americogermano777@gmail.com>" -m "$COMMIT_MSG"
  echo "✓ Commit realizado: $COMMIT_MSG"
fi

# Enviar para o GitHub (centauro e centaurofc)
if [ -n "$TOKEN" ]; then
  REPOS=("github.com/Germano2025/centauro.git" "github.com/Germano2025/centaurofc.git")

  for REPO in "${REPOS[@]}"; do
    echo "Enviando alterações para o GitHub ($REPO)..."
    PUSH_OUTPUT=$(git push "https://oauth2:${TOKEN}@${REPO}" main 2>&1) && PUSH_STATUS=0 || PUSH_STATUS=$?

    # Se falhou por divergência de histórico
    if [ $PUSH_STATUS -ne 0 ] && echo "$PUSH_OUTPUT" | grep -qi "rejected\|fetch first\|failed to push"; then
      echo "Resolvendo divergência com o histórico remoto de $REPO..."
      PUSH_OUTPUT=$(git push --force "https://oauth2:${TOKEN}@${REPO}" main 2>&1) && PUSH_STATUS=0 || PUSH_STATUS=$?
    fi

    if [ $PUSH_STATUS -eq 0 ]; then
      echo "✓ SUCESSO: Repositório $REPO atualizado na branch 'main'!"
    else
      echo "⚠️ Aviso para $REPO: $PUSH_OUTPUT"
    fi
  done

  echo "✓ Sincronização concluída com sucesso para os repositórios GitHub!"
  exit 0
  else
    echo "⚠️ Falha ao enviar para o GitHub:"
    echo "$PUSH_OUTPUT"
    
    if echo "$PUSH_OUTPUT" | grep -qi "403"; then
      echo ""
      echo "DIAGNÓSTICO DO ERRO 403 (Permissão Negada):"
      echo "O GitHub recusou o envio porque seu token de acesso não possui permissão de gravação."
      echo "Como resolver em 1 minuto:"
      echo "1. No GitHub, acesse: Settings > Developer Settings > Personal access tokens"
      echo "2. Se estiver usando 'Fine-grained token':"
      echo "   - Em 'Repository access', selecione 'All repositories' (ou selecione o repositório 'centauro')."
      echo "   - Em 'Permissions' > 'Repository permissions' > marque 'Contents' como 'Read and write' (Leitura e gravação)."
      echo "3. Se preferir usar 'Token (classic)':"
      echo "   - Crie um novo token clássico e marque a caixa '[x] repo'."
      echo "4. Cole o novo token no sistema ou no arquivo .github_token e tente novamente!"
    elif echo "$PUSH_OUTPUT" | grep -qi "404"; then
      echo ""
      echo "DIAGNÓSTICO DO ERRO 404 (Repositório não encontrado):"
      echo "O repositório 'centauro' não existe na conta Germano2025 ou o token não tem acesso a ele."
      echo "Crie o repositório 'centauro' no seu GitHub (https://github.com/new) e certifique-se de dar acesso ao token."
    fi
    exit 1
  fi
else
  echo "⚠️ Nenhum GITHUB_TOKEN configurado."
  echo "Para que o push ocorra automaticamente, configure seu token com:"
  echo "echo \"seu_token_github\" > .github_token"
  echo "Tentando push com credenciais do ambiente..."
  git push -u origin main
fi
