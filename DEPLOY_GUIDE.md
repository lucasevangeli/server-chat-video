# Guia de Deploy: Aplicação de Vídeo Chat na DigitalOcean com Ubuntu

Este guia detalha o processo completo para implantar sua aplicação de vídeo chat em uma VPS (Droplet) da DigitalOcean rodando Ubuntu.

**Pré-requisitos:**
- Uma conta na DigitalOcean.
- Um nome de domínio registrado.
- Seu projeto versionado em um repositório Git (GitHub, GitLab, etc.).

---

### Passo 1: Configuração Inicial do Servidor

Assim que você acessar seu novo Droplet Ubuntu, você estará no terminal com acesso `root`, pronto para começar. O prompt será parecido com `root@ubuntu-s-2vcpu-4gb-120gb-intel-sfo2-01:~#`.

**1.1. Atualizar o Servidor**
O primeiro passo é garantir que todos os pacotes do sistema estejam atualizados.

```bash
apt update && apt upgrade -y
```

**1.2. Criar um Usuário Não-Root**
Por segurança, não é recomendado usar o usuário `root` para tarefas do dia a dia.

```bash
# Substitua 'seu-usuario' pelo nome que desejar
adduser seu-usuario

# Dê a este usuário privilégios de superusuário (sudo)
usermod -aG sudo seu-usuario

# Faça login com seu novo usuário
su - seu-usuario
```
Daqui para frente, todos os comandos serão executados com este novo usuário.

**1.3. Configurar o Firewall Básico (UFW)**
Vamos habilitar o firewall para permitir apenas conexões SSH, HTTP e HTTPS.

```bash
# Permitir conexões SSH (para que você não perca o acesso)
sudo ufw allow OpenSSH

# Habilitar o firewall
sudo ufw enable

# Verifique o status
sudo ufw status
```

---

### Passo 2: Instalar Dependências Principais

Vamos instalar o Nginx (servidor web/proxy), Docker (para rodar nossa aplicação) e Git (para baixar o código).

```bash
# Instalar Nginx, Docker e Git
sudo apt install -y nginx docker.io git

# Iniciar e habilitar os serviços para que iniciem com o sistema
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl start docker
sudo systemctl enable docker

# Adicionar seu usuário ao grupo do Docker para poder executar comandos docker sem 'sudo'
sudo usermod -aG docker ${USER}
# IMPORTANTE: Você precisa sair e entrar novamente na sessão SSH para que esta mudança tenha efeito.
exit 
# E então, conecte-se novamente: ssh seu-usuario@SEU_ENDERECO_DE_IP
```
Após reconectar, confirme que funciona: `docker ps`

---

### Passo 3: Instalar e Configurar o Servidor TURN (Coturn)

**3.1. Instalar o Coturn**
```bash
sudo apt install -y coturn
```

**3.2. Configurar o Coturn**
Edite o arquivo de configuração principal:
```bash
sudo nano /etc/turnserver.conf
```
Apague ou comente tudo no arquivo e cole a seguinte configuração, **ajustando os valores marcados**:

```ini
# Endereço IP público do seu Droplet
listening-ip=SEU_ENDERECO_DE_IP_PUBLICO

# Porta de escuta padrão para o TURN
listening-port=3478

# Porta de escuta para TLS (será usada após configurar o SSL)
tls-listening-port=5349

# Faixa de portas para as sessões de relay
min-port=49152
max-port=65535

# Mecanismo de autenticação
lt-cred-mech

# Define um usuário e senha estáticos para o TURN.
# Use senhas fortes aqui!
user=SEU_USUARIO_TURN:SUA_SENHA_TURN

# O "reino" (realm) do seu servidor. Use seu domínio.
realm=seu-dominio.com

# --- Descomente estas linhas APENAS no PASSO 8 ---
# Caminhos para os certificados SSL que serão gerados pelo Certbot
# cert=/etc/letsencrypt/live/seu-dominio.com/fullchain.pem
# pkey=/etc/letsencrypt/live/seu-dominio.com/privkey.pem

# Configurações de segurança
no-stdout-log
no-multicast-peers
no-loopback-peers
```
Salve o arquivo (`Ctrl+X`, `Y`, `Enter`).

**3.3. Habilitar o Coturn**
Edite o arquivo padrão para que o serviço seja executado.
```bash
sudo nano /etc/default/coturn
```
Encontre a linha `TURNSERVER_ENABLED=0` e mude para `1`.

**3.4. Abrir Portas no Firewall para o Coturn**
```bash
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 5349/udp # TLS
sudo ufw allow 5349/tcp # TLS
sudo ufw allow 49152:65535/udp # Range de portas de relay
```

**3.5. Iniciar o Coturn**
```bash
sudo systemctl restart coturn
sudo systemctl enable coturn
```

---

### Passo 4: Baixar a Aplicação

Clone seu projeto do repositório Git.

```bash
git clone SEU_LINK_DO_REPOSITORIO.git
cd NOME_DA_PASTA_DO_PROJETO
```

---

### Passo 5: Configurar o DNS

Vá até o painel de controle do seu provedor de domínio (GoDaddy, Namecheap, etc.) e crie/atualize os seguintes registros do tipo `A`:
- **Registro 1:**
  - **Host/Nome:** `@` (ou `seu-dominio.com`)
  - **Valor/Aponta para:** `SEU_ENDERECO_DE_IP_PUBLICO`
- **Registro 2:**
  - **Host/Nome:** `www`
  - **Valor/Aponta para:** `SEU_ENDERECO_DE_IP_PUBLICO`

A propagação do DNS pode levar de alguns minutos a algumas horas.

---

### Passo 6: Configurar o Nginx como Proxy Reverso

**6.1. Copiar o Arquivo de Configuração**
Use o arquivo `nginx.example.conf` do seu projeto como base.

```bash
# Substitua 'seu-dominio.com' pelo seu domínio real
sudo cp nginx.example.conf /etc/nginx/sites-available/seu-dominio.com
```

**6.2. Ativar a Configuração**
Crie um link simbólico para habilitar o site.

```bash
sudo ln -s /etc/nginx/sites-available/seu-dominio.com /etc/nginx/sites-enabled/
```

**6.3. Testar a Configuração do Nginx**
```bash
sudo nginx -t
```
Se mostrar "syntax is ok" e "test is successful", você está pronto para continuar.

---

### Passo 7: Gerar Certificado SSL com Certbot

**7.1. Instalar o Certbot**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

**7.2. Obter o Certificado**
O Certbot irá gerar o certificado e editar automaticamente sua configuração do Nginx para usar HTTPS.

```bash
# Substitua com seu domínio e www
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```
Siga as instruções na tela. Ele pedirá seu e-mail e para concordar com os termos de serviço. Escolha a opção para redirecionar o tráfego HTTP para HTTPS.

---

### Passo 8: Configuração Final e Lançamento

**8.1. Atualizar o Coturn com os Certificados SSL**
Agora que os certificados existem, edite `turnserver.conf` novamente.
```bash
sudo nano /etc/turnserver.conf
```
Descomente as linhas `cert` e `pkey` e verifique se os caminhos correspondem ao seu domínio.
```ini
cert=/etc/letsencrypt/live/seu-dominio.com/fullchain.pem
pkey=/etc/letsencrypt/live/seu-dominio.com/privkey.pem
```
Reinicie o Coturn para aplicar as alterações.
```bash
sudo systemctl restart coturn
```

**8.2. Criar Arquivos de Ambiente (`.env`)**
Dentro da pasta do seu projeto, crie os arquivos `.env` com as configurações de produção.

**Arquivo 1: `.env` (para o front-end)**
```bash
nano .env
```
Conteúdo:
```
# URL do seu backend
VITE_BACKEND_URL=https://seu-dominio.com

# Credenciais do Servidor TURN
VITE_TURN_URL=turn:seu-dominio.com:3478
VITE_TURN_USERNAME=SEU_USUARIO_TURN
VITE_TURN_CREDENTIAL=SUA_SENHA_TURN
```

**Arquivo 2: `server/.env` (para o back-end)**
```bash
nano server/.env
```
Conteúdo:
```
# URL do seu front-end para o CORS
CLIENT_URL=https://seu-dominio.com
```

**8.3. Construir e Rodar a Aplicação com Docker**
```bash
# Construa a imagem Docker
docker build -t video-chat-app .

# Rode o container
# -p 127.0.0.1:3001:3001: Mapeia a porta 3001 do container para a porta 3001 da VPS, mas apenas acessível localmente (o Nginx irá intermediar).
# -d: Roda em modo "detached" (em segundo plano).
# --restart=always: Reinicia o container automaticamente se ele falhar ou se a VPS for reiniciada.
docker run -p 127.0.0.1:3001:3001 -d --name video-chat --restart=always video-chat-app
```

---

### Passo 9: Verificação Final

Se tudo correu bem, você deve conseguir acessar `https://seu-dominio.com` no navegador e ver sua aplicação funcionando.

**Comandos úteis para depuração:**
- **Ver logs do container Docker:** `docker logs video-chat`
- **Ver status do serviço Nginx:** `sudo systemctl status nginx`
- **Ver status do serviço Coturn:** `sudo systemctl status coturn`

Parabéns, sua aplicação está no ar!
