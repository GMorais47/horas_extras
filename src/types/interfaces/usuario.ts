import { IAcesso } from "./acesso";
import { IIntervalo } from "./intervalo";

export interface IUsuario {
    id: number,
    matricula: string,
    nome: string,
    acessos: IAcesso[],
    horarios: IIntervalo[]
}