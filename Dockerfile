# --- Estágio 1: Build do Front-end ---
# Usamos uma imagem Node para ter as ferramentas de build (npm)
FROM node:18-alpine AS build-frontend

WORKDIR /app

# Copia os arquivos de dependência e instala elas
# Isso aproveita o cache do Docker se as dependências não mudarem
COPY package*.json ./
RUN npm install

# Copia o resto do código do front-end
COPY . .

# Roda o script de build para gerar os arquivos estáticos
RUN npm run build


# --- Estágio 2: Instalação das dependências do Back-end ---
# Usamos uma imagem Node separada para o back-end
FROM node:18-alpine AS build-backend

WORKDIR /app

# Copia os arquivos de dependência do servidor e instala apenas o necessário para produção
COPY server/package*.json server/
RUN cd server && npm install --production

# Copia o código do servidor
COPY server/ server/


# --- Estágio 3: Imagem Final de Produção ---
# Partimos de uma imagem Node limpa e leve
FROM node:18-alpine

WORKDIR /app

# Define o diretório de trabalho do servidor
ENV NODE_ENV=production

# Copia os arquivos estáticos do front-end construídos no Estágio 1
COPY --from=build-frontend /app/dist ./dist

# Copia o código e as dependências do back-end do Estágio 2
COPY --from=build-backend /app/server ./server

# Expõe a porta em que o servidor Node.js vai rodar
EXPOSE 3001

# Comando para iniciar o servidor quando o container for executado
CMD ["node", "server/index.js"]
