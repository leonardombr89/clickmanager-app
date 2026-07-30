import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { ClickTvMidia, ClickTvPlaylistDetalhe, ClickTvPlaylistItem } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';

@Component({
  selector: 'app-clicktv-playlist-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MaterialModule, TemPermissaoDirective],
  templateUrl: './clicktv-playlist-editor.component.html',
  styleUrls: ['../../clicktv.scss', './clicktv-playlist-editor.component.scss'],
})
export class ClickTvPlaylistEditorComponent implements OnInit {
  playlist?: ClickTvPlaylistDetalhe;
  biblioteca: ClickTvMidia[] = [];
  busca = '';
  carregando = true;
  salvando = false;
  readonly playlistId = Number(this.route.snapshot.paramMap.get('id'));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: ClickTvService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.carregarPlaylist();
    this.carregarBiblioteca();
  }

  carregarPlaylist(): void {
    this.carregando = true;
    this.service.detalharPlaylist(this.playlistId).subscribe({
      next: (playlist) => { this.playlist = playlist; this.carregando = false; },
      error: () => { this.carregando = false; this.toastr.error('Não foi possível carregar a playlist.'); },
    });
  }

  carregarBiblioteca(): void {
    this.service.listarMidias({ nome: this.busca.trim() || undefined, status: 'DISPONIVEL', page: 0, size: 100 })
      .subscribe({
        next: (res) => this.biblioteca = res.content || [],
        error: () => this.toastr.error('Não foi possível carregar a biblioteca de mídias.'),
      });
  }

  adicionar(midia: ClickTvMidia): void {
    const duracao = midia.tipo === 'IMAGEM' ? (midia.duracaoSegundos || 10) : undefined;
    this.executar(() => this.service.adicionarItem(this.playlistId, midia.id, duracao), 'Mídia adicionada.');
  }

  mover(item: ClickTvPlaylistItem, direcao: -1 | 1): void {
    if (!this.playlist) return;
    const itens = [...this.playlist.itens].sort((a, b) => a.ordem - b.ordem);
    const atual = itens.findIndex((value) => value.id === item.id);
    const destino = atual + direcao;
    if (atual < 0 || destino < 0 || destino >= itens.length) return;
    [itens[atual], itens[destino]] = [itens[destino], itens[atual]];
    this.executar(() => this.service.reordenarItens(this.playlistId, itens.map((value) => value.id)), 'Ordem atualizada.');
  }

  salvarItem(item: ClickTvPlaylistItem): void {
    const duracao = item.midiaTipo === 'IMAGEM' ? Number(item.duracaoSegundos) : null;
    if (item.midiaTipo === 'IMAGEM' && (!duracao || duracao <= 0)) {
      this.toastr.warning('Informe uma duração maior que zero para a imagem.');
      return;
    }
    this.executar(() => this.service.editarItem(this.playlistId, item.id, duracao, item.ativo), 'Item atualizado.');
  }

  remover(item: ClickTvPlaylistItem): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { title: 'Remover item', message: `Remover "${item.midiaNome}" desta playlist?`, confirmText: 'Remover', confirmColor: 'warn' },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.salvando = true;
      this.service.removerItem(this.playlistId, item.id).subscribe({
        next: () => { this.salvando = false; this.toastr.success('Item removido.'); this.carregarPlaylist(); },
        error: (error) => this.tratarErro(error),
      });
    });
  }

  duracaoTotal(): number {
    return (this.playlist?.itens || []).filter((item) => item.ativo)
      .reduce((total, item) => total + Number(item.duracaoSegundos || 0), 0);
  }

  private executar(
    action: () => ReturnType<ClickTvService['detalharPlaylist']>,
    sucesso: string
  ): void {
    this.salvando = true;
    action().subscribe({
      next: (playlist) => {
        this.playlist = playlist;
        this.salvando = false;
        this.toastr.success(sucesso);
      },
      error: (error) => this.tratarErro(error),
    });
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.salvando = false;
    if (error.status === 409) {
      this.toastr.warning(error.error?.message || 'A playlist foi alterada ou a mídia está em conflito. Recarregamos os dados.');
      this.carregarPlaylist();
      return;
    }
    this.toastr.error(error.error?.message || 'Não foi possível atualizar a playlist.');
  }
}
