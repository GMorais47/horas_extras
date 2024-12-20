import { Injectable } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import puppeteer from "puppeteer";
import { IExtra } from "src/types/interfaces/extra";

@Injectable()
export class PDFService {
    async criarPDF(inicio: Date, fim: Date, extra: IExtra, logs: string): Promise<string> {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        const htmlTemplate = this.gerarTemplateHTML(extra, logs);

        await page.setContent(htmlTemplate);

        const outputPath = path.join(process.env.PATH_OUTPUT, `RELATORIOS`, `${inicio.toLocaleDateString().replaceAll("/", "-")}_ate_${fim.toLocaleDateString().replaceAll("/", "-")}`);

        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const pdfPath = path.join(outputPath, `${extra.usuario.id}_${extra.usuario.nome.replaceAll(" ", "_")}.pdf`);

        await page.pdf({ path: pdfPath, format: 'A4' });

        await browser.close();

        return pdfPath;
    }

    private gerarTemplateHTML(extra: IExtra, logs: string): string {
        const hora_valor = Number(process.env.HORA_VALOR); 
        const segundo_valor = hora_valor / 3600;

        const duracao_total = extra.extras.reduce((prev, curr) => prev + curr.duracao, 0);
        const valor_total = duracao_total * segundo_valor

        let rowsHtml = '';

        for (const acesso of extra.extras) {

            const entrada = acesso.entrada.data.toLocaleString()
            const saida = acesso.saida.data.toLocaleString()

            rowsHtml += `
            <tr>
              <td>${entrada}</td>
              <td>${saida}</td>
              <td>${this.formatarDuracao(acesso.duracao)}</td>
              <td>R$ ${(acesso.duracao * segundo_valor).toFixed(2).replace('.', ',')}</td>
            </tr>
          `;
        }

        return `
          <html>
          <head>
              <style>
                  @page {
                      size: A4;
                  }
                  body {
                      margin: 1cm .5cm .5cm 1cm;
                      font-family: Arial, sans-serif;
                      color: #333;
                  }
                  table {
                      width: 100%;
                      border-collapse: collapse;
                      margin-top: 20px;
                  }
                  caption {
                      font-size: x-large;
                      font-weight: bold;
                      margin-bottom: 15px;
                  }
                  th,
                  td {
                      border: 1px solid #000;
                      padding: 8px;
                      text-align: center;
                  }
                  th {
                      background-color: #f2f2f2;
                      font-weight: bold;
                  }
                  .signatures {
                      margin-top: 2cm;
                      display: flex;
                      justify-content: space-between;
                  }
                  .signature-block {
                      width: 32%;
                      text-align: center;
                  }
                  .signature-line {
                      border-top: 1px solid #000;
                      margin: 0 20px;
                      padding-top: 10px;
                  }
                  p {
                      margin-top: 20px;
                  }
                  strong {
                      color: #000;
                  }
              </style>
          </head>
          <body>
              <div>
                  <table>
                      <thead>
                          <caption>Relatório de Acesso Extras</caption>
                          <tr>
                              <th>Entrada</th>
                              <th>Saída</th>
                              <th>Duração</th>
                              <th>Valor</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${rowsHtml}
                      </tbody>
                      <tfoot>
                          <tr style="font-weight: bold; background-color: #f2f2f2;">
                              <td colspan="2">Totais</td>
                              <td>${this.formatarDuracao(duracao_total)}</td>
                              <td>R$ ${valor_total.toFixed(2).replace('.', ',')}</td>
                          </tr>
                      </tfoot>
                  </table>
    
                  <div>
                      <p>Para verificar os detalhes dos cálculos, acesse os <strong>logs</strong> no diretório: ${logs}</p>
                  </div>
    
                  <div class="signatures">
                      <div class="signature-block">
                          <div class="signature-line"></div>
                          ${extra.usuario.nome}
                      </div>
                      <div class="signature-block">
                          <div class="signature-line"></div>
                          Responsável 2
                      </div>
                      <div class="signature-block">
                          <div class="signature-line"></div>
                          Responsável 3
                      </div>
                  </div>
              </div>
          </body>
          </html>
        `;
    }

    private formatarDuracao(duracao: number): string {
        const horas = Math.floor(duracao / 3600);
        const minutos = Math.floor((duracao % 3600) / 60);
        const segundos = duracao % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }

}