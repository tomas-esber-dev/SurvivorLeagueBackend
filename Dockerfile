FROM node:18

# working directory in the container from which all commands will be run
WORKDIR /usr/src/app

COPY package*.json ./

# installs the dependencies in the container
RUN npm install

COPY . .

EXPOSE 8080

# command to run the application
CMD ["node", "index.js"]