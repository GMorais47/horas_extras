import { IAcesso } from "./acesso"
import { IUsuario } from "./usuario"

export interface IExtra {
    usuario: IUsuario,
    extras: {
        entrada: IAcesso,
        saida: IAcesso,
        duracao: number
    }[]
}