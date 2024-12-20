import { EPortal } from "../enums/portal";

export interface IAcesso {
    data: Date,
    evento: number,
    portal: EPortal,
}