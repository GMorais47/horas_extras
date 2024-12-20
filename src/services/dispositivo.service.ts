import 'dotenv/config'
import { HttpService } from "@nestjs/axios";
import { TryCatchService } from "./try-catch.service";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { IAcesso } from 'src/types/interfaces/acesso';
import { EPortal } from 'src/types/enums/portal';
import { IUsuario } from 'src/types/interfaces/usuario';
import { IIntervalo } from 'src/types/interfaces/intervalo';

@Injectable()
export class DispositivoService {
    private readonly endereco: string = process.env.DISPOSITIVO_ENDERECO;
    private readonly usuario: string = process.env.DISPOSITIVO_USUARIO;
    private readonly senha: string = process.env.DISPOSITIVO_SENHA;
    private sessao: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly trycatch: TryCatchService
    ) {
        if (!this.endereco || !this.usuario || !this.senha) {
            throw new InternalServerErrorException("As variáveis de ambiente DISPOSITIVO_ENDERECO, DISPOSITIVO_USUARIO ou DISPOSITIVO_SENHA não estão definidas.");
        }
    }

    private async validar<T>(fn: () => Promise<T>): Promise<T> {
        return this.trycatch.executar(async () => {
            if (!this.sessao) {
                await this.login()
                return await fn()
            } else {
                const { data } = await this.httpService.axiosRef.post(this.endereco + `/session_is_valid.fcgi?session=${this.sessao}`)
                if (!data.session_is_valid)
                    await this.login()
                return await fn()
            }
        })
    }

    private async login() {
        await this.trycatch.executar(async () => {
            const { data } = await this.httpService.axiosRef.post(this.endereco + "/login.fcgi", {
                login: this.usuario,
                password: this.senha
            })
            this.sessao = data.session
        })
    }

    private async logout() {
        await this.trycatch.executar(async () => {
            if (this.sessao) {
                await this.httpService.axiosRef.post(this.endereco + `/logout.fcgi?session=${this.sessao}`)
                this.sessao = undefined
            }
        })
    }

    private async executar<T>(fn: () => Promise<T>) {
        return await this.trycatch.executar(async () => {
            const resposta = await this.validar(fn)
            await this.logout()
            return resposta
        })
    }

    private async obterGruposDoUsuario(usuario: number) {
        const { data: usuarioGrupos } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
            object: "user_groups",
            where: [
                {
                    object: "user_groups",
                    field: "user_id",
                    operator: "=",
                    value: usuario
                }
            ]
        });

        const grupos = await Promise.all(usuarioGrupos.user_groups.map(async ({ group_id }) => {
            const { data } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
                object: "groups",
                where: [
                    {
                        object: "groups",
                        field: "id",
                        operator: "=",
                        value: group_id
                    }
                ]
            });
            return data.groups[0];
        }));

        return grupos;
    }

    private async obterPermissoesDosGrupos(grupos: any[]) {
        const permissoes = await Promise.all(grupos.map(async grupo => {
            const { data } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
                object: "group_access_rules",
                where: [
                    {
                        object: "group_access_rules",
                        field: "group_id",
                        operator: "=",
                        value: grupo.id
                    }
                ]
            });
            return data["group_access_rules"].map(({ access_rule_id }) => access_rule_id);
        }));

        return permissoes.flat();
    }

    private async obterGrupoIntervalosDeTempo(permissoesGrupo: number[]) {
        const grupoIntervalosDeTempo = await Promise.all(permissoesGrupo.map(async permissao => {
            const { data } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
                object: "access_rule_time_zones",
                where: [
                    {
                        object: "access_rule_time_zones",
                        field: "access_rule_id",
                        operator: "=",
                        value: permissao
                    }
                ]
            });

            const timeZones = await Promise.all(data["access_rule_time_zones"].map(async ({ time_zone_id }) => {
                const { data } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
                    object: "time_zones",
                    where: [
                        {
                            object: "time_zones",
                            field: "id",
                            operator: "=",
                            value: time_zone_id
                        }
                    ]
                });
                return data["time_zones"].map(({ id, name }) => ({ id, nome: name }));
            }));

            return timeZones.flat();
        }));

        return grupoIntervalosDeTempo.flat();
    }

    private async obterIntervalosDeTempo(grupoIntervalosDeTempo: any[]): Promise<IIntervalo[]> {
        const intervalosDeTempo = await Promise.all(grupoIntervalosDeTempo.map(async grupo => {
            const { data } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
                object: "time_spans",
                where: [
                    {
                        object: "time_spans",
                        field: "time_zone_id",
                        operator: "=",
                        value: grupo.id
                    }
                ]
            });
            return data["time_spans"].map((obj: any) => ({
                id: obj.id,
                grupo_intervalo: grupo,
                inicio: obj.start,
                fim: obj.end,
                domingo: obj.sun === 1,
                segunda: obj.mon === 1,
                terca: obj.tue === 1,
                quarta: obj.wed === 1,
                quinta: obj.thu === 1,
                sexta: obj.fri === 1,
                sabado: obj.sat === 1,
                feriado_1: obj.hol1 === 1,
                feriado_2: obj.hol2 === 1,
                feriado_3: obj.hol3 === 1
            } as IIntervalo));
        }));

        return intervalosDeTempo.flat();
    }

    async obtemUsuarios(): Promise<IUsuario[]> {
        return await this.executar(async () => {
            const { data } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
                object: "users",
            })

            return data.users.map(usuario => ({
                id: usuario.id as number,
                matricula: usuario.registration as string,
                nome: usuario.name as string,
                acessos: []
            }))
        })
    }

    async obterHorarios(usuario: number) {
        return await this.executar(async () => {
            const usuarioGrupos = await this.obterGruposDoUsuario(usuario);

            const permissoesGrupo = await this.obterPermissoesDosGrupos(usuarioGrupos);

            const grupoIntervalosDeTempo = await this.obterGrupoIntervalosDeTempo(permissoesGrupo);

            const intervalosDeTempo = await this.obterIntervalosDeTempo(grupoIntervalosDeTempo);

            return intervalosDeTempo;
        });
    }

    async obterAcessos(usuario: number, inicio: Date, fim: Date): Promise<IAcesso[]> {
        return await this.executar(async () => {
            const key = "access_logs"
            const { data } = await this.httpService.axiosRef.post(this.endereco + `/load_objects.fcgi?session=${this.sessao}`, {
                object: key,
                where: {
                    access_logs: {
                        user_id: usuario,
                        event: 7,
                        time: {
                            ">=": Math.floor(inicio.getTime() / 1000),
                            "<=": Math.floor(fim.getTime() / 1000)
                        }
                    },
                }
            })

            return data[key].map(acesso => {
                const dataBrasil = new Date(acesso.time * 1000); 
                dataBrasil.setHours(dataBrasil.getHours() + 3)
                return {
                    data: dataBrasil,
                    evento: acesso.event,
                    portal: acesso.portal_id === 1 ? EPortal.ENTRADA : EPortal.SAIDA,
                }
            })
        })
    }
}