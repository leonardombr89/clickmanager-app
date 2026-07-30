import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ClickTvMidia,
  ClickTvMidiaUtilizacao,
  ClickTvOrientacao,
  ClickTvPage,
  ClickTvPlaylistDetalhe,
  ClickTvPlaylistPayload,
  ClickTvPlaylistResumo,
  ClickTvStatusMidia,
  ClickTvStatusTela,
  ClickTvTela,
  ClickTvTelaPayload,
  ClickTvTipoMidia,
  clickTvHttpParams,
} from '../models/clicktv.models';

@Injectable({ providedIn: 'root' })
export class ClickTvService {
  private readonly baseUrl = `${environment.apiUrl}/api/clicktv`;

  constructor(private readonly http: HttpClient) {}

  listarMidias(filtro: { nome?: string; tipo?: ClickTvTipoMidia; status?: ClickTvStatusMidia; page?: number; size?: number }): Observable<ClickTvPage<ClickTvMidia>> {
    return this.http.get<ClickTvPage<ClickTvMidia>>(`${this.baseUrl}/midias`, {
      params: new HttpParams({ fromObject: clickTvHttpParams(filtro) }),
    });
  }

  detalharMidia(id: number): Observable<ClickTvMidia> {
    return this.http.get<ClickTvMidia>(`${this.baseUrl}/midias/${id}`);
  }

  uploadMidia(arquivo: File, nome?: string, duracaoImagem?: number): Observable<HttpEvent<ClickTvMidia>> {
    const body = new FormData();
    body.append('arquivo', arquivo, arquivo.name);
    const params = new HttpParams({ fromObject: clickTvHttpParams({ nome, duracaoImagem }) });
    return this.http.post<ClickTvMidia>(`${this.baseUrl}/midias`, body, {
      params,
      observe: 'events',
      reportProgress: true,
    });
  }

  renomearMidia(id: number, nome: string): Observable<ClickTvMidia> {
    return this.http.patch<ClickTvMidia>(`${this.baseUrl}/midias/${id}`, { nome });
  }

  excluirMidia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/midias/${id}`);
  }

  utilizacoesMidia(id: number): Observable<ClickTvMidiaUtilizacao[]> {
    return this.http.get<ClickTvMidiaUtilizacao[]>(`${this.baseUrl}/midias/${id}/utilizacoes`);
  }

  listarPlaylists(filtro: { nome?: string; orientacao?: ClickTvOrientacao; ativa?: boolean; page?: number; size?: number }): Observable<ClickTvPage<ClickTvPlaylistResumo>> {
    return this.http.get<ClickTvPage<ClickTvPlaylistResumo>>(`${this.baseUrl}/playlists`, {
      params: new HttpParams({ fromObject: clickTvHttpParams(filtro) }),
    });
  }

  detalharPlaylist(id: number): Observable<ClickTvPlaylistDetalhe> {
    return this.http.get<ClickTvPlaylistDetalhe>(`${this.baseUrl}/playlists/${id}`);
  }

  criarPlaylist(payload: ClickTvPlaylistPayload): Observable<ClickTvPlaylistDetalhe> {
    return this.http.post<ClickTvPlaylistDetalhe>(`${this.baseUrl}/playlists`, payload);
  }

  editarPlaylist(id: number, payload: ClickTvPlaylistPayload): Observable<ClickTvPlaylistDetalhe> {
    return this.http.put<ClickTvPlaylistDetalhe>(`${this.baseUrl}/playlists/${id}`, payload);
  }

  desativarPlaylist(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/playlists/${id}`);
  }

  duplicarPlaylist(id: number, nome?: string): Observable<ClickTvPlaylistDetalhe> {
    return this.http.post<ClickTvPlaylistDetalhe>(`${this.baseUrl}/playlists/${id}/duplicar`, { nome });
  }

  adicionarItem(playlistId: number, midiaId: number, duracaoSegundos?: number): Observable<ClickTvPlaylistDetalhe> {
    return this.http.post<ClickTvPlaylistDetalhe>(`${this.baseUrl}/playlists/${playlistId}/itens`, {
      midiaId,
      duracaoSegundos,
      ativo: true,
    });
  }

  editarItem(playlistId: number, itemId: number, duracaoSegundos: number | null, ativo: boolean): Observable<ClickTvPlaylistDetalhe> {
    return this.http.put<ClickTvPlaylistDetalhe>(`${this.baseUrl}/playlists/${playlistId}/itens/${itemId}`, {
      duracaoSegundos,
      ativo,
    });
  }

  removerItem(playlistId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/playlists/${playlistId}/itens/${itemId}`);
  }

  reordenarItens(playlistId: number, itemIds: number[]): Observable<ClickTvPlaylistDetalhe> {
    return this.http.put<ClickTvPlaylistDetalhe>(`${this.baseUrl}/playlists/${playlistId}/ordenacao`, { itemIds });
  }

  listarTelas(filtro: { nome?: string; orientacao?: ClickTvOrientacao; status?: ClickTvStatusTela; ativa?: boolean; page?: number; size?: number }): Observable<ClickTvPage<ClickTvTela>> {
    return this.http.get<ClickTvPage<ClickTvTela>>(`${this.baseUrl}/telas`, {
      params: new HttpParams({ fromObject: clickTvHttpParams(filtro) }),
    });
  }

  vincularTela(payload: ClickTvTelaPayload & { codigo: string; telaId?: number }): Observable<ClickTvTela> {
    return this.http.post<ClickTvTela>(`${this.baseUrl}/telas/vincular`, payload);
  }

  editarTela(id: number, payload: ClickTvTelaPayload): Observable<ClickTvTela> {
    return this.http.put<ClickTvTela>(`${this.baseUrl}/telas/${id}`, payload);
  }

  alterarPlaylistPadrao(id: number, playlistId: number | null): Observable<ClickTvTela> {
    return this.http.patch<ClickTvTela>(`${this.baseUrl}/telas/${id}/playlist-padrao`, { playlistId });
  }

  desvincularTela(id: number): Observable<ClickTvTela> {
    return this.http.post<ClickTvTela>(`${this.baseUrl}/telas/${id}/desvincular`, {});
  }

  desativarTela(id: number): Observable<ClickTvTela> {
    return this.http.post<ClickTvTela>(`${this.baseUrl}/telas/${id}/desativar`, {});
  }
}
