import { HttpException, Injectable, Logger } from "@nestjs/common";

@Injectable()
export class TryCatchService {
    private readonly logger = new Logger(TryCatchService.name)
    async executar<T>(fn: () => Promise<T>) {
        try {
            return await fn()
        } catch (error) {
            this.logger.error(error.message) 
        }
    }
}