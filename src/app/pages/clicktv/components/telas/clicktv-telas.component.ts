import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import {
  ClickTvPlaylistResumo,
  ClickTvStatusTela,
  ClickTvTela,
  ClickTvTelaPayload,
} from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import { ClickTvTelaDialogComponent } from '../dialogs/clicktv-dialogs.component';

@Component({
  selector: 'app-clicktv-telas',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, CardHeaderComponent, TemPermissaoDirective],
  templateUrl: './clicktv-telas.component.html',
  styleUrls: ['../../clicktv.scss'],
})
export class ClickTvTelasComponent implements OnInit {
  telas: ClickTvTela[] = [];
  playlists: ClickTvPlaylistResumo[] = [];
  total = 0;
  page = 0;
  size = 10;
  nome = '';
  status: ClickTvStatusTela | '' = '';
  carregando = false;
  readonly statuses: ClickTvStatusTela[] = ['AGUARDANDO_ATIVACAO', 'ONLINE', 'OFFLINE', 'DESATIVADA'];
  readonly colunas = ['nome', 'orientacao', 'status', 'playlist', 'conexao', 'acoes'];

  constructor(
    private readonly service: ClickTvService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregar();
    this.service.listarPlaylists({ ativa: true, page: 0, size: 200 }).subscribe({
      next: (res) => this.playlists = res.content || [],
      error: () => this.toastr.error('Não foi possível carregar as playlists disponíveis.'),
    });
  }

  carregar(): void {
    this.carregando = true;
    this.service.listarTelas({
      nome: this.nome.trim() || undefined,
      status: this.status || undefined,
      page: this.page,
      size: this.size,
    }).subscribe({
      next: (res) => { this.telas = res.content || []; this.total = res.totalElements || 0; this.carregando = false; },
      error: () => { this.carregando = false; this.toastr.error('Não foi possível carregar as telas.'); },
    });
  }
  pesquisar(): void { this.page = 0; this.carregar(); }
  pagina(event: PageEvent): void { this.page = event.pageIndex; this.size = event.pageSize; this.carregar(); }

  vincular(tela?: ClickTvTela): void {
    if (tela?.status === 'DESATIVADA') {
      this.toastr.warning('Uma tela desativada não pode ser vinculada novamente.');
      return;
    }
    this.dialog.open(ClickTvTelaDialogComponent, {
      width: '560px',
      data: { vincular: true, tela },
    }).afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.service.vincularTela(payload).subscribe({
        next: () => { this.toastr.success(tela ? 'Tela vinculada novamente.' : 'Tela vinculada com sucesso.'); this.carregar(); },
        error: (error) => this.erroAtivacao(error),
      });
    });
  }

  editar(tela: ClickTvTela): void {
    this.dialog.open(ClickTvTelaDialogComponent, {
      width: '560px',
      data: { vincular: false, tela },
    }).afterClosed().subscribe((payload: ClickTvTelaPayload | undefined) => {
      if (!payload) return;
      this.service.editarTela(tela.id, payload).subscribe({
        next: () => { this.toastr.success('Tela atualizada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível editar a tela.'),
      });
    });
  }

  alterarPlaylist(tela: ClickTvTela, value: number | null): void {
    this.service.alterarPlaylistPadrao(tela.id, value).subscribe({
      next: () => { this.toastr.success('Playlist padrão atualizada.'); this.carregar(); },
      error: () => { this.toastr.error('Não foi possível alterar a playlist padrão.'); this.carregar(); },
    });
  }

  desvincular(tela: ClickTvTela): void {
    this.confirmar(
      'Desvincular tela',
      `Desvincular "${tela.nome}"? O player precisará de um novo código para voltar a operar.`,
      'Desvincular',
      () => this.service.desvincularTela(tela.id),
      'Tela desvinculada.'
    );
  }

  desativar(tela: ClickTvTela): void {
    this.confirmar(
      'Desativar tela',
      `Desativar "${tela.nome}"? Esta ação é permanente e a tela não poderá ser vinculada novamente.`,
      'Desativar',
      () => this.service.desativarTela(tela.id),
      'Tela desativada.'
    );
  }

  statusClass(status: ClickTvStatusTela): string {
    return status === 'ONLINE' ? 'success' : status === 'AGUARDANDO_ATIVACAO' ? 'warning' : status === 'DESATIVADA' ? 'neutral' : 'danger';
  }

  private confirmar(
    title: string,
    message: string,
    confirmText: string,
    action: () => ReturnType<ClickTvService['desativarTela']>,
    sucesso: string
  ): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '430px',
      data: { title, message, confirmText, confirmColor: 'warn' },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      action().subscribe({
        next: () => { this.toastr.success(sucesso); this.carregar(); },
        error: () => this.toastr.error('Não foi possível concluir a operação.'),
      });
    });
  }

  private erroAtivacao(error: HttpErrorResponse): void {
    if (error.status === 409) {
      this.toastr.warning(error.error?.message || 'Este código já foi utilizado ou a tela não pode ser vinculada.');
    } else if (error.status === 404 || error.status === 410) {
      this.toastr.warning('Código inválido ou expirado. Gere um novo código no player.');
    } else {
      this.toastr.error(error.error?.message || 'Não foi possível vincular a tela.');
    }
  }
}
