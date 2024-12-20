import { Injectable, Logger } from '@nestjs/common';
import { TryCatchService } from './services/try-catch.service';
import { DispositivoService } from './services/dispositivo.service';
import * as fs from 'fs';
import * as path from 'path';
import { EPortal } from './types/enums/portal';
import { PDFService } from './services/pdf.service';
import { IExtra } from './types/interfaces/extra';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AppService {
  private readonly path_log = path.join(process.env.PATH_LOGS, "logs");
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly trycatch: TryCatchService,
    private readonly dispositivo: DispositivoService,
    private readonly pdfService: PDFService
  ) { }

  private setLog(output: string, nome: string, capturas: string[]) {
    if (capturas.length > 0) {
      try {
        output = output.replaceAll(" ", "_")
        if (!fs.existsSync(output)) {
          fs.mkdirSync(output, { recursive: true });
        }

        const caminho_arquivo = path.join(output, nome)

        fs.writeFileSync(caminho_arquivo, capturas.join('\n'), { encoding: 'utf8' });
      } catch (error) {
        this.logger.error(`Erro ao salvar o arquivo: ${error.message}`);
      }
    }
  }

  private setHorario(date: Date, horas: number, minutos: number, segundos: number, milissegundos = 0): Date {
    const newDate = new Date(date);
    newDate.setHours(horas, minutos, segundos, milissegundos);
    return newDate;
  }

  private setTempo(segundos: number) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return { horas, minutos, segundos: Math.floor(segundos % 60) }
  }

  private async calcularExtra(inicio: Date, fim: Date): Promise<IExtra[]> {
    const logs: string[] = []
    let temp: string;

    temp = `Iniciando processamento dos dados do período ${inicio.toLocaleDateString("pt-BR")} até ${fim.toLocaleDateString("pt-BR")}!`
    this.logger.log(temp)
    logs.push(temp)

    const usuarios = await this.dispositivo.obtemUsuarios()

    temp = `Quantidade de usuários recuperados: ${usuarios.length}`
    this.logger.log(temp)
    logs.push(temp)

    let quantidade_total_de_acessos = 0;

    let resposta: IExtra[] = []

    for (let usuario of usuarios) {
      let resposta_usuario: IExtra = {
        usuario,
        extras: []
      }
      usuario.acessos = await this.dispositivo.obterAcessos(usuario.id, inicio, fim)
      if (usuario.acessos.length > 0) {
        usuario.horarios = await this.dispositivo.obterHorarios(usuario.id)
        if (usuario.horarios.length > 0) {
          temp = `========== ${usuario.nome} ==========`
          logs.push(temp)

          quantidade_total_de_acessos += usuario.acessos.length

          temp = `Quantidade de acessos: ${usuario.acessos.length}`
          logs.push(temp)

          let tempo_total_trabalhado = 0;

          for (let i = 0; i < usuario.acessos.length; i++) {
            const acesso_base = usuario.acessos[i]
            let acesso_relativo = usuario.acessos[i + 1]

            const horario = usuario.horarios.filter(horario => horario.grupo_intervalo.nome.includes("[EXTRA]")).find(horario => {
              const inicio = this.setHorario(acesso_base.data, this.setTempo(horario.inicio).horas, this.setTempo(horario.inicio).minutos, this.setTempo(horario.inicio).segundos)
              const fim = this.setHorario(acesso_base.data, this.setTempo(horario.fim).horas, this.setTempo(horario.fim).minutos, this.setTempo(horario.fim).segundos, 999)
              const esta_entre = acesso_base.data.getTime() >= inicio.getTime() && acesso_base.data.getTime() <= fim.getTime()
              return esta_entre && (
                (acesso_base.data.getDay() === 0 && horario.domingo) ||
                (acesso_base.data.getDay() === 1 && horario.segunda) ||
                (acesso_base.data.getDay() === 2 && horario.terca) ||
                (acesso_base.data.getDay() === 3 && horario.quarta) ||
                (acesso_base.data.getDay() === 4 && horario.quinta) ||
                (acesso_base.data.getDay() === 5 && horario.sexta) ||
                (acesso_base.data.getDay() === 6 && horario.sabado)
              )
            })

            if (horario) {
              const inicio = this.setHorario(acesso_base.data, this.setTempo(horario.inicio).horas, this.setTempo(horario.inicio).minutos, 0)
              const fim = this.setHorario(acesso_base.data, this.setTempo(horario.fim).horas, this.setTempo(horario.fim).minutos, 0)

              const is_acesso_extra = (acesso_base.data.getTime() >= inicio.getTime() && acesso_base.data.getTime() <= fim.getTime())

              if (is_acesso_extra) {

                let tempo_trabalhado = 0;

                if (acesso_relativo) {

                  const is_relativo_extra = (acesso_relativo.data.getTime() >= inicio.getTime() && acesso_relativo.data.getTime() <= fim.getTime())

                  if (is_relativo_extra) {

                    if (acesso_base.portal === EPortal.ENTRADA && acesso_relativo.portal === EPortal.SAIDA) {
                      tempo_trabalhado += (acesso_relativo.data.getTime() / 1000) - (acesso_base.data.getTime() / 1000)
                      resposta_usuario.extras.push({
                        entrada: acesso_base,
                        saida: acesso_relativo,
                        duracao: tempo_trabalhado
                      })
                      i++
                    }

                    if (acesso_base.portal === EPortal.SAIDA && acesso_relativo.portal === EPortal.ENTRADA) {
                      const novo_relativo = {
                        data: inicio,
                        evento: 7,
                        portal: EPortal.ENTRADA
                      }

                      temp = `Acesso ${acesso_relativo.data.toLocaleString()} não é um acesso de hora extra! Ele será substituído por ${novo_relativo.data.toLocaleString()}`
                      logs.push(temp)

                      acesso_relativo = novo_relativo

                      tempo_trabalhado += (acesso_base.data.getTime() / 1000) - (acesso_relativo.data.getTime() / 1000)
                      resposta_usuario.extras.push({
                        entrada: acesso_relativo,
                        saida: acesso_base,
                        duracao: tempo_trabalhado
                      })
                    }

                  } else {

                    const novo_relativo = {
                      data: acesso_base.portal === EPortal.ENTRADA ? fim : inicio,
                      evento: 7,
                      portal: acesso_base.portal === EPortal.ENTRADA ? EPortal.SAIDA : EPortal.ENTRADA
                    }

                    temp = `Acesso ${acesso_relativo.data.toLocaleString()} não é um acesso de hora extra! Ele será substituído por ${novo_relativo.data.toLocaleString()}`
                    logs.push(temp)

                    acesso_relativo = novo_relativo

                    if (acesso_base.portal === EPortal.ENTRADA && acesso_relativo.portal === EPortal.SAIDA) {
                      tempo_trabalhado += (acesso_relativo.data.getTime() / 1000) - (acesso_base.data.getTime() / 1000)
                      resposta_usuario.extras.push({
                        entrada: acesso_base,
                        saida: acesso_relativo,
                        duracao: tempo_trabalhado
                      })
                    }

                    if (acesso_base.portal === EPortal.SAIDA && acesso_relativo.portal === EPortal.ENTRADA) {
                      tempo_trabalhado += (acesso_base.data.getTime() / 1000) - (acesso_relativo.data.getTime() / 1000)
                      resposta_usuario.extras.push({
                        entrada: acesso_relativo,
                        saida: acesso_base,
                        duracao: tempo_trabalhado
                      })
                    }
                  }

                  const duracao = this.setTempo(tempo_trabalhado)

                  temp = `Base: ${acesso_base.data.toLocaleString()} (${acesso_base.portal}) | Relativo: ${acesso_relativo.data.toLocaleString()} (${acesso_relativo.portal}) | Duração: ${duracao.horas}:${duracao.minutos}:${duracao.segundos}`

                  logs.push(temp)

                } else {
                  const novo_relativo = {
                    data: acesso_base.portal === EPortal.ENTRADA ? fim : inicio,
                    evento: 7,
                    portal: acesso_base.portal === EPortal.ENTRADA ? EPortal.SAIDA : EPortal.ENTRADA
                  }

                  temp = `Nenhum acesso relativo encontrado! Está sendo definido o ${novo_relativo.data.toLocaleString()}`
                  logs.push(temp)

                  acesso_relativo = novo_relativo

                  if (acesso_base.portal === EPortal.ENTRADA && acesso_relativo.portal === EPortal.SAIDA) {
                    tempo_trabalhado += (acesso_relativo.data.getTime() / 1000) - (acesso_base.data.getTime() / 1000)
                    resposta_usuario.extras.push({
                      entrada: acesso_base,
                      saida: acesso_relativo,
                      duracao: tempo_trabalhado
                    })
                  }

                  if (acesso_base.portal === EPortal.SAIDA && acesso_relativo.portal === EPortal.ENTRADA) {
                    tempo_trabalhado += (acesso_base.data.getTime() / 1000) - (acesso_relativo.data.getTime() / 1000)
                    resposta_usuario.extras.push({
                      entrada: acesso_relativo,
                      saida: acesso_base,
                      duracao: tempo_trabalhado
                    })
                  }

                  const duracao = this.setTempo(tempo_trabalhado)
                  logs.push(`Base: ${acesso_base.data.toLocaleString()} | Relativo: ${acesso_relativo.data.toLocaleString()} | Duração: ${duracao.horas}:${duracao.minutos}:${duracao.segundos}`)
                }

                tempo_total_trabalhado += tempo_trabalhado

              } else {
                temp = `Acesso ${acesso_base.data.toLocaleString()} não é um acesso de hora extra!`
                logs.push(temp)
              }
            } else {
              temp = `Acesso ${acesso_base.data.toLocaleString()} não se enquadra a nenhuma regra de horário extra!`
              logs.push(temp)
            }
          }

          const duracao = this.setTempo(tempo_total_trabalhado)
          temp = `Usuário ${usuario.id} - ${usuario.nome} teve duração total de ${duracao.horas}:${duracao.minutos}:${duracao.segundos}!`
          this.logger.log(temp)
          logs.push(temp)
        } else {
          temp = `Usuário ${usuario.id} - ${usuario.nome} não possui nenhuma faixa de horário!`
          this.logger.warn(temp)
          logs.push(temp)
        }
      } else {
        temp = `Usuário ${usuario.id} - ${usuario.nome} não possui nenhum acesso no período pesquisado!`
        this.logger.warn(temp)
        logs.push(temp)
      }
      if (resposta_usuario.extras.length > 0) {
        resposta.push(resposta_usuario)
      }
    }

    temp = `Quantidade de acessos recuperados: ${quantidade_total_de_acessos}`
    this.logger.log(temp)
    logs.push(temp)

    const log_nome = `${inicio.toLocaleDateString().replaceAll("/", "-")}_ate_${fim.toLocaleDateString().replaceAll("/", "-")}.txt`
    this.setLog(this.path_log, log_nome, logs)
    return resposta
  }

  @Cron(process.env.AGENDAMENTO ?? "10 0 * * *")
  async onModuleInit() {
    return this.trycatch.executar(async () => {

      const fim = new Date();
      fim.setDate(fim.getDate() - 1);
      fim.setHours(23, 59, 59, 999);

      const inicio = new Date(fim);
      inicio.setDate(fim.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);

      const extras = await this.calcularExtra(inicio, fim)

      extras.sort((a, b) => a.usuario.nome.localeCompare(b.usuario.nome))

      for (const extra of extras) {
        const path = await this.pdfService.criarPDF(inicio, fim, extra, this.path_log)
        this.logger.log(`Usuário ${extra.usuario.id} - ${extra.usuario.nome} caminho: ${path}`)
      }

    })
  }
}