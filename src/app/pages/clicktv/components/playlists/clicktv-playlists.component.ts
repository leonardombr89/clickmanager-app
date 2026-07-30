import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { CLICKTV_ORIENTACOES, ClickTvOrientacao, ClickTvPlaylistPayload, ClickTvPlaylistResumo } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import { ClickTvNameDialogComponent, ClickTvPlaylistDialogComponent } from '../dialogs/clicktv-dialogs.component';

@Component({
  selector: 'app-clicktv-playlists',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, CardHeaderComponent, TemPermissaoDirective],
  templateUrl: './clicktv-playlists.component.html',
  styleUrls: ['../../clicktv.scss'],
})
export class ClickTvPlaylistsComponent implements OnInit {
  playlists: ClickTvPlaylistResumo[] = [];
  total = 0;
  page = 0;
  size = 10;
  nome = '';
  orientacao: ClickTvOrientacao | '' = '';
  ativa: boolean | '' = '';
  carregando = false;
  readonly orientacoes = CLICKTV_ORIENTACOES;
  readonly colunas = ['nome', 'orientacao', 'itens', 'versao', 'status', 'acoes'];

  constructor(
    private readonly service: ClickTvService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly router: Router
  ) {}

  ngOnInit(): void { this.carregar(); }
  carregar(): void {
    this.carregando = true;
    this.service.listarPlaylists({
      nome: this.nome.trim() || undefined,
      orientacao: this.orientacao || undefined,
      ativa: this.ativa === '' ? undefined : this.ativa,
      page: this.page,
      size: this.size,
    }).subscribe({
      next: (res) => { this.playlists = res.content || []; this.total = res.totalElements || 0; this.carregando = false; },
      error: () => { this.carregando = false; this.toastr.error('Não foi possível carregar as playlists.'); },
    });
  }
  pesquisar(): void { this.page = 0; this.carregar(); }
  pagina(event: PageEvent): void { this.page = event.pageIndex; this.size = event.pageSize; this.carregar(); }

  criar(): void {
    this.dialog.open(ClickTvPlaylistDialogComponent, { width: '560px', data: null }).afterClosed()
      .subscribe((payload: ClickTvPlaylistPayload | undefined) => {
        if (!payload) return;
        this.service.criarPlaylist(payload).subscribe({
          next: (playlist) => {
            this.toastr.success('Playlist criada.');
            this.router.navigate(['/page/clicktv/playlists', playlist.id]);
          },
          error: () => this.toastr.error('Não foi possível criar a playlist.'),
        });
      });
  }

  editar(playlist: ClickTvPlaylistResumo): void {
    this.dialog.open(ClickTvPlaylistDialogComponent, { width: '560px', data: playlist }).afterClosed()
      .subscribe((payload: ClickTvPlaylistPayload | undefined) => {
        if (!payload) return;
        this.service.editarPlaylist(playlist.id, payload).subscribe({
          next: () => { this.toastr.success('Playlist atualizada.'); this.carregar(); },
          error: () => this.toastr.error('Não foi possível editar a playlist.'),
        });
      });
  }

  abrir(playlist: ClickTvPlaylistResumo): void {
    this.router.navigate(['/page/clicktv/playlists', playlist.id]);
  }

  duplicar(playlist: ClickTvPlaylistResumo): void {
    this.dialog.open(ClickTvNameDialogComponent, {
      width: '500px',
      data: { titulo: 'Duplicar playlist', nome: `${playlist.nome} (cópia)` },
    }).afterClosed().subscribe((nome) => {
      if (!nome) return;
      this.service.duplicarPlaylist(playlist.id, nome).subscribe({
        next: () => { this.toastr.success('Playlist duplicada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível duplicar a playlist.'),
      });
    });
  }

  desativar(playlist: ClickTvPlaylistResumo): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { title: 'Desativar playlist', message: `Desativar "${playlist.nome}"?`, confirmText: 'Desativar', confirmColor: 'warn' },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.desativarPlaylist(playlist.id).subscribe({
        next: () => { this.toastr.success('Playlist desativada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível desativar a playlist.'),
      });
    });
  }
}
