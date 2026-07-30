import { HttpEventType } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClickTvService } from './clicktv.service';

describe('ClickTvService', () => {
  let service: ClickTvService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ClickTvService],
    });
    service = TestBed.inject(ClickTvService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista mídias com paginação e sem parâmetros vazios', () => {
    service.listarMidias({ nome: '', tipo: 'VIDEO', page: 1, size: 12 }).subscribe();

    const req = http.expectOne((request) =>
      request.url === 'http://localhost:8080/api/clicktv/midias' &&
      request.params.get('tipo') === 'VIDEO' &&
      request.params.get('page') === '1' &&
      request.params.get('size') === '12'
    );
    expect(req.request.params.has('nome')).toBeFalse();
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 12 });
  });

  it('envia mídia como multipart e publica progresso', () => {
    const eventos: HttpEventType[] = [];
    const arquivo = new File(['imagem'], 'oferta.png', { type: 'image/png' });
    service.uploadMidia(arquivo, 'Oferta', 8).subscribe((event) => eventos.push(event.type));

    const req = http.expectOne((request) =>
      request.url === 'http://localhost:8080/api/clicktv/midias' &&
      request.params.get('nome') === 'Oferta' &&
      request.params.get('duracaoImagem') === '8'
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBeTrue();
    const arquivoEnviado = (req.request.body as FormData).get('arquivo') as File;
    expect(arquivoEnviado.name).toBe('oferta.png');
    expect(arquivoEnviado.type).toBe('image/png');
    req.flush({ id: 1 });
    expect(eventos).toContain(HttpEventType.Response);
  });

  it('usa os contratos administrativos de playlist', () => {
    service.reordenarItens(7, [3, 1, 2]).subscribe();
    const reorder = http.expectOne('http://localhost:8080/api/clicktv/playlists/7/ordenacao');
    expect(reorder.request.method).toBe('PUT');
    expect(reorder.request.body).toEqual({ itemIds: [3, 1, 2] });
    reorder.flush({ id: 7, itens: [] });

    service.duplicarPlaylist(7, 'Cópia').subscribe();
    const duplicate = http.expectOne('http://localhost:8080/api/clicktv/playlists/7/duplicar');
    expect(duplicate.request.method).toBe('POST');
    expect(duplicate.request.body).toEqual({ nome: 'Cópia' });
    duplicate.flush({ id: 8, itens: [] });
  });

  it('vincula uma tela sem enviar credencial do player', () => {
    service.vincularTela({
      codigo: '482913',
      nome: 'Vitrine',
      descricaoLocal: 'Entrada',
      orientacao: 'HORIZONTAL',
    }).subscribe();

    const req = http.expectOne('http://localhost:8080/api/clicktv/telas/vincular');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      codigo: '482913',
      nome: 'Vitrine',
      descricaoLocal: 'Entrada',
      orientacao: 'HORIZONTAL',
    });
    expect(req.request.body.credencial).toBeUndefined();
    req.flush({ id: 1 });
  });

  it('altera playlist padrão e desvincula a tela pelos endpoints corretos', () => {
    service.alterarPlaylistPadrao(4, 9).subscribe();
    const playlist = http.expectOne('http://localhost:8080/api/clicktv/telas/4/playlist-padrao');
    expect(playlist.request.method).toBe('PATCH');
    expect(playlist.request.body).toEqual({ playlistId: 9 });
    playlist.flush({ id: 4 });

    service.desvincularTela(4).subscribe();
    const unlink = http.expectOne('http://localhost:8080/api/clicktv/telas/4/desvincular');
    expect(unlink.request.method).toBe('POST');
    unlink.flush({ id: 4 });
  });
});
