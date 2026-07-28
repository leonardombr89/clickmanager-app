import { of } from 'rxjs';
import { CalculadoraMaterialService } from './calculadora-material.service';

describe('CalculadoraMaterialService', () => {
  let api: any;
  let service: CalculadoraMaterialService;

  beforeEach(() => {
    api = {
      get: jasmine.createSpy('get').and.returnValue(of({})),
      put: jasmine.createSpy('put').and.returnValue(of({})),
      patch: jasmine.createSpy('patch').and.returnValue(of({})),
      post: jasmine.createSpy('post').and.returnValue(of({})),
    };
    service = new CalculadoraMaterialService(api);
  });

  it('usa somente endpoints oficiais da Calculadora de Materiais', () => {
    service.buscarConfiguracao(10).subscribe();
    service.salvarConfiguracao(10, { tipoCalculoMaterial: 'REVESTIMENTO_AREA', embalagem: null, percentualPerdaPadrao: null, permiteAlterarPercentualPerda: true, quantidadeMinimaVenda: null, multiploVenda: null, ativo: false }).subscribe();
    service.alterarHabilitacao(10, false).subscribe();
    service.listarHabilitados().subscribe();
    service.pesquisarDisponiveis('porcelanato', 15).subscribe();
    service.validarProduto(10).subscribe();
    service.habilitarProduto(10).subscribe();

    const endpoints = [
      ...api.get.calls.allArgs().map((args: any[]) => args[0]),
      ...api.put.calls.allArgs().map((args: any[]) => args[0]),
      ...api.patch.calls.allArgs().map((args: any[]) => args[0]),
      ...api.post.calls.allArgs().map((args: any[]) => args[0]),
    ];

    expect(endpoints.every((endpoint) => String(endpoint).startsWith('api/calculadoras/materiais'))).toBeTrue();
    expect(endpoints.some((endpoint) => String(endpoint).includes('smartcalc'))).toBeFalse();
    expect(api.put.calls.mostRecent().args[0]).toBe('api/calculadoras/materiais/produtos/10/configuracao');
    expect(api.patch.calls.mostRecent().args).toEqual(['api/calculadoras/materiais/produtos/10/habilitacao', { ativo: false }]);
    expect(api.post.calls.mostRecent().args).toEqual(['api/calculadoras/materiais/produtos/10/habilitar', {}]);
  });

  it('envia q e limite na busca de produtos disponiveis', () => {
    service.pesquisarDisponiveis('argamassa', 7).subscribe();

    const params = api.get.calls.mostRecent().args[1];
    expect(api.get.calls.mostRecent().args[0]).toBe('api/calculadoras/materiais/produtos/disponiveis');
    expect(params.get('q')).toBe('argamassa');
    expect(params.get('limite')).toBe('7');
  });
});
