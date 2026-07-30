import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MaterialModule } from 'src/app/material.module';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { ClickTvMidia, ClickTvStatusMidia, ClickTvTipoMidia } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import {
  ClickTvMidiaPreviewDialogComponent,
  ClickTvNameDialogComponent,
  ClickTvUploadDialogComponent,
} from '../dialogs/clicktv-dialogs.component';

@Component({
  selector: 'app-clicktv-midias',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, CardHeaderComponent, TemPermissaoDirective],
  templateUrl: './clicktv-midias.component.html',
  styleUrls: ['../../clicktv.scss'],
})
export class ClickTvMidiasComponent implements OnInit {
  midias: ClickTvMidia[] = [];
  total = 0;
  page = 0;
  size = 12;
  nome = '';
  tipo: ClickTvTipoMidia | '' = '';
  status: ClickTvStatusMidia | '' = '';
  carregando = false;
  uploadProgresso: number | null = null;
  readonly tipos: ClickTvTipoMidia[] = ['IMAGEM', 'VIDEO'];
  readonly statuses: ClickTvStatusMidia[] = ['PROCESSANDO', 'DISPONIVEL', 'ERRO'];

  constructor(
    private readonly service: ClickTvService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.carregando = true;
    this.service.listarMidias({
      nome: this.nome.trim() || undefined,
      tipo: this.tipo || undefined,
      status: this.status || undefined,
      page: this.page,
      size: this.size,
    }).subscribe({
      next: (res) => {
        this.midias = res.content || [];
        this.total = res.totalElements || 0;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.toastr.error('Não foi possível carregar as mídias do ClickTV.');
      },
    });
  }

  pesquisar(): void { this.page = 0; this.carregar(); }
  pagina(event: PageEvent): void { this.page = event.pageIndex; this.size = event.pageSize; this.carregar(); }

  enviar(): void {
    this.dialog.open(ClickTvUploadDialogComponent, { width: '560px' }).afterClosed().subscribe((result) => {
      if (!result) return;
      this.uploadProgresso = 0;
      this.service.uploadMidia(result.arquivo, result.nome, result.duracaoImagem).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgresso = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          }
          if (event.type === HttpEventType.Response) {
            this.uploadProgresso = null;
            this.toastr.success('Mídia enviada com sucesso.');
            this.carregar();
          }
        },
        error: () => {
          this.uploadProgresso = null;
          this.toastr.error('Não foi possível enviar a mídia. Verifique formato e tamanho.');
        },
      });
    });
  }

  visualizar(midia: ClickTvMidia): void {
    forkJoin({
      midia: this.service.detalharMidia(midia.id),
      utilizacoes: this.service.utilizacoesMidia(midia.id),
    }).subscribe({
      next: (data) => this.dialog.open(ClickTvMidiaPreviewDialogComponent, { width: '820px', data }),
      error: () => this.toastr.error('Não foi possível abrir a mídia.'),
    });
  }

  renomear(midia: ClickTvMidia): void {
    this.dialog.open(ClickTvNameDialogComponent, {
      width: '500px',
      data: { titulo: 'Renomear mídia', nome: midia.nome },
    }).afterClosed().subscribe((nome) => {
      if (!nome || nome === midia.nome) return;
      this.service.renomearMidia(midia.id, nome).subscribe({
        next: () => { this.toastr.success('Mídia renomeada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível renomear a mídia.'),
      });
    });
  }

  excluir(midia: ClickTvMidia): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      data: {
        title: 'Excluir mídia definitivamente',
        message: `Excluir "${midia.nome}"? Ela será removida de todas as playlists e apagada definitivamente. Esta ação não pode ser desfeita; para utilizá-la novamente será necessário fazer um novo upload.`,
        confirmText: 'Excluir definitivamente',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.excluirMidia(midia.id).subscribe({
        next: () => { this.toastr.success('Mídia excluída definitivamente.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível excluir a mídia. Se for um vídeo, aguarde o processamento terminar.'),
      });
    });
  }

  tamanho(bytes: number): string {
    if (!bytes) return '0 B';
    const unidades = ['B', 'KB', 'MB', 'GB'];
    const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
    return `${(bytes / 1024 ** indice).toFixed(indice ? 1 : 0)} ${unidades[indice]}`;
  }

  statusClass(status: ClickTvStatusMidia): string {
    return status === 'DISPONIVEL' ? 'success' : status === 'PROCESSANDO' ? 'warning' : status === 'ERRO' ? 'danger' : 'neutral';
  }
}
