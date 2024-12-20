import { Controller, Get, Param, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

@Controller('logs')
export class LogsController {
  private readonly logsDir = path.join(process.env.PATH_LOGS, "logs") // Caminho para o diretório de logs

  // Rota para listar arquivos de log
  @Get()
  listLogs(@Res() res: Response) {
    fs.readdir(this.logsDir, (err, files) => {
      if (err) {
        console.error('Erro ao listar arquivos de log:', err);
        return res.status(500).send('Erro ao listar arquivos de log.');
      }

      // Estilo básico para a lista de arquivos, com cor vermelha
      let htmlContent = `
        <html>
          <head>
            <title>Logs de Horas Extras</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f7fa;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                color: #333;
              }
              .container {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                width: 80%;
                max-width: 600px;
              }
              h1 {
                text-align: center;
                color: #FF5733; /* Cor Vermelha */
              }
              .search-box {
                margin-bottom: 20px;
                text-align: center;
              }
              input[type="text"] {
                padding: 10px;
                width: 80%;
                font-size: 16px;
                border: 1px solid #ccc;
                border-radius: 5px;
              }
              ul {
                list-style: none;
                padding: 0;
              }
              li {
                margin: 10px 0;
                padding: 10px;
                background-color: #f9f9f9;
                border-radius: 5px;
                transition: background-color 0.3s;
              }
              li:hover {
                background-color: #f1d0d0; /* Cor de hover vermelha */
              }
              a {
                text-decoration: none;
                color: #FF5733; /* Cor Vermelha */
                font-size: 16px;
              }
              a:hover {
                text-decoration: underline;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #777;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Arquivos de Log</h1>
              <div class="search-box">
                <input type="text" id="search" placeholder="Filtrar logs..." oninput="filterLogs()">
              </div>
              <ul id="logList">`;

      // Gera um link para cada arquivo
      files.forEach(file => {
        htmlContent += `<li><a href="/logs/${file}" target="_blank">${file}</a></li>`;
      });

      htmlContent += `
              </ul>
              <div class="footer">
                <p>© 2024 Horas Extras - Goianinho</p>
              </div>
            </div>
  
            <script>
              // Função para filtrar os arquivos de log conforme o texto digitado
              function filterLogs() {
                const searchInput = document.getElementById('search').value.toLowerCase();
                const logList = document.getElementById('logList');
                const logItems = logList.getElementsByTagName('li');
  
                for (let i = 0; i < logItems.length; i++) {
                  const logItem = logItems[i];
                  const text = logItem.textContent || logItem.innerText;
                  if (text.toLowerCase().indexOf(searchInput) > -1) {
                    logItem.style.display = '';
                  } else {
                    logItem.style.display = 'none';
                  }
                }
              }
            </script>
          </body>
        </html>
      `;

      // Retorna o HTML com links estilizados
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    });
  }

  // Rota para visualizar o conteúdo de um arquivo de log
  @Get(':filename')
  viewLog(@Res() res: Response, @Param('filename') filename: string) {
    const filePath = path.join(this.logsDir, filename);
  
    // Verifica se o arquivo existe no diretório
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Arquivo de log não encontrado.');
    }
  
    // Lê o conteúdo do arquivo
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        // Caso ocorra um erro ao tentar ler o arquivo
        console.error('Erro ao ler o arquivo de log:', err);
        return res.status(500).send('Erro ao ler o arquivo de log.');
      }
  
      // Envia o conteúdo do arquivo de log no formato HTML, mantendo a formatação
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`
        <html>
          <head>
            <title>Visualização de Log - ${filename}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f7fa;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                color: #333;
              }
              .container {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                width: 80%;
                max-width: 800px;
              }
              h1 {
                text-align: center;
                color: #FF5733; /* Cor Vermelha */
              }
              pre {
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 5px;
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                max-height: 400px;
                margin-top: 20px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #777;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Visualização do Log: ${filename}</h1>
              <pre>${data}</pre>
              <div class="footer">
                <p>© 2024 Horas Extras - Goianinho</p>
              </div>
            </div>
          </body>
        </html>
      `);
    });
  }
  

  // Função para destacar o texto
  highlightText(text: string, search: string): string {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<span class="match">$1</span>');
  }

}