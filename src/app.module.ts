import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TryCatchService } from './services/try-catch.service';
import { DispositivoService } from './services/dispositivo.service';
import { PDFService } from './services/pdf.service';
import { LogsController } from './controllers/logs.controller';
import { RelatorioController } from './controllers/relatorio.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot()
  ],
  providers: [
    TryCatchService,
    DispositivoService,
    PDFService,
    AppService
  ],
  controllers:[
    RelatorioController,
    LogsController
  ]
})
export class AppModule { }
