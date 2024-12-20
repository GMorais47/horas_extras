import { IGrupoIntervalo } from "./grupo-intervalo";

export interface IIntervalo {
    id: number,
    grupo_intervalo: IGrupoIntervalo,
    inicio: number,
    fim: number,
    domingo: boolean,
    segunda: boolean,
    terca: boolean,
    quarta: boolean,
    quinta: boolean,
    sexta: boolean,
    sabado: boolean,
    feriado_1: boolean,
    feriado_2: boolean,
    feriado_3: boolean
}