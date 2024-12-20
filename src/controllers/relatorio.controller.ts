import { Controller, Get, Param, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';
import { join } from 'path';

@Controller("relatorios") // Prefixo para todas as rotas deste controller
export class RelatorioController {
  private readonly reportsDir = join(process.env.PATH_OUTPUT, 'RELATORIOS');

  // Rota 1: Listagem das Pastas (Relatórios)
  @Get()
  listReports(@Res() res: Response) {
    fs.readdir(this.reportsDir, { withFileTypes: true }, (err, files) => {
      if (err) {
        console.error('Erro ao listar relatórios:', err);
        return res.status(500).send('Erro ao listar relatórios.');
      }

      // Filtra apenas as pastas
      const folders = files.filter(file => file.isDirectory()).map(folder => folder.name);

      // Estilo básico para a lista de pastas
      let htmlContent = `
        <html>
          <head>
            <title>Relatórios de Horas Extras</title>
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
                margin: 0;
                max-height: 300px; /* Defina a altura máxima da lista */
                overflow-y: auto; /* Adiciona a rolagem vertical */
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
              <h1>Selecione uma Pasta</h1>
              <div class="search-box">
                <input type="text" id="search" placeholder="Filtrar pastas..." oninput="filterFolders()">
              </div>
              <ul id="folderList">`;

      // Gera um link para cada pasta
      folders.forEach(folder => {
        htmlContent += `<li><a href="/relatorios/${folder}" target="_blank">${folder}</a></li>`;
      });

      htmlContent += `
              </ul>
              <div class="footer">
                <p>© 2024 Horas Extras - Goianinho</p>
              </div>
            </div>
  
            <script>
              // Função para filtrar as pastas conforme o texto digitado
              function filterFolders() {
                const searchInput = document.getElementById('search').value.toLowerCase();
                const folderList = document.getElementById('folderList');
                const folderItems = folderList.getElementsByTagName('li');
  
                for (let i = 0; i < folderItems.length; i++) {
                  const folderItem = folderItems[i];
                  const text = folderItem.textContent || folderItem.innerText;
                  if (text.toLowerCase().indexOf(searchInput) > -1) {
                    folderItem.style.display = '';
                  } else {
                    folderItem.style.display = 'none';
                  }
                }
              }
            </script>
          </body>
        </html>
      `;

      // Retorna o HTML com as pastas listadas
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    });
  }

  // Rota 2: Listagem dos arquivos PDF dentro de uma Pasta (Relatório)
  @Get(':folder')
  listPDFsInFolder(@Res() res: Response, @Param('folder') folder: string) {
    const folderPath = path.join(this.reportsDir, folder);

    // Verifica se a pasta existe
    if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
      return res.status(404).send('Pasta de relatório não encontrada.');
    }

    // Lê os arquivos dentro da pasta
    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error('Erro ao listar arquivos na pasta:', err);
        return res.status(500).send('Erro ao listar arquivos na pasta.');
      }

      // Filtra apenas os arquivos .pdf
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));

      // Estilo básico para a lista de arquivos PDF
      let htmlContent = `
        <html>
          <head>
            <title>Arquivos PDF - ${folder}</title>
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
                margin: 0;
                max-height: 300px; /* Defina a altura máxima da lista */
                overflow-y: auto; /* Adiciona a rolagem vertical */
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
              <h1>Arquivos PDF do Relatório: ${folder}</h1>
              <div class="search-box">
                <input type="text" id="search" placeholder="Filtrar arquivos..." oninput="filterPDFs()">
              </div>
              <ul id="pdfList">`;

      // Gera um link para cada arquivo PDF e seu log correspondente
      pdfFiles.forEach(pdfFile => {
        // O arquivo de log será baseado no nome da pasta e não no nome do PDF
        const logFile = folder + '.txt'; // Nome do log baseado no nome da pasta

        // Adiciona o link para o PDF e o link para o log
        htmlContent += `
          <li>
            <a href="/relatorios/${folder}/${pdfFile}" target="_blank">${pdfFile}</a>
            &nbsp;|&nbsp;
            <a href="/logs/${logFile}" target="_blank">Visualizar Log</a>
          </li>
        `;
      });

      htmlContent += `
              </ul>
              <div class="footer">
                <p>© 2024 Horas Extras - Goianinho</p>
              </div>
            </div>
      
            <script>
              // Função para filtrar os arquivos PDF conforme o texto digitado
              function filterPDFs() {
                const searchInput = document.getElementById('search').value.toLowerCase();
                const pdfList = document.getElementById('pdfList');
                const pdfItems = pdfList.getElementsByTagName('li');
      
                for (let i = 0; i < pdfItems.length; i++) {
                  const pdfItem = pdfItems[i];
                  const text = pdfItem.textContent || pdfItem.innerText;
                  if (text.toLowerCase().indexOf(searchInput) > -1) {
                    pdfItem.style.display = '';
                  } else {
                    pdfItem.style.display = 'none';
                  }
                }
              }
            </script>
          </body>
        </html>
      `;

      // Retorna o HTML com os arquivos PDF listados
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    });
  }

  // Rota 3: Visualizar um arquivo PDF
  @Get(':folder/:file')
  viewPDF(@Res() res: Response, @Param('folder') folder: string, @Param('file') file: string) {
    const filePath = path.join(this.reportsDir, folder, file);

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath) || !file.endsWith('.pdf')) {
      return res.status(404).send('Arquivo PDF não encontrado.');
    }

    // Envia o arquivo PDF para o cliente
    res.sendFile(filePath);
  }
}
