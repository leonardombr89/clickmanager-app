import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { ProdutoCalculadoraMateriaisTabComponent } from './produto-calculadora-materiais-tab.component';

describe('ProdutoCalculadoraMateriaisTabComponent', () => {
  function criarComponente(query: Record<string, string> = {}) {
    const service = {
      buscarConfiguracao: jasmine.createSpy('buscarConfiguracao').and.returnValue(of(config({ status: 'NAO_CONFIGURADO', podeHabilitar: false }))),
      salvarConfiguracao: jasmine.createSpy('salvarConfiguracao').and.returnValue(of(config({ status: 'CONFIGURACAO_INCOMPLETA', podeHabilitar: false }))),
      validarProduto: jasmine.createSpy('validarProduto').and.returnValue(of(busca({ status: 'CONFIGURACAO_INCOMPLETA', podeAdicionar: false }))),
      habilitarProduto: jasmine.createSpy('habilitarProduto').and.returnValue(of(config({ status: 'HABILITADO', ativo: true, podeHabilitar: true }))),
      alterarHabilitacao: jasmine.createSpy('alterarHabilitacao').and.returnValue(of(config({ status: 'PRONTO_PARA_HABILITAR', ativo: false, podeHabilitar: true }))),
    };
    const route = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => query[key] ?? null,
        },
      },
    };
    const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    const toastr = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
    };
    const component = new ProdutoCalculadoraMateriaisTabComponent(new FormBuilder(), service as any, route as any, router as any, toastr as any);
    component.produtoId = 10;
    return { component, service, router, toastr };
  }

  it('carrega a configuracao ao receber produtoId', () => {
    const { component, service } = criarComponente();

    component.ngOnChanges({ produtoId: {} as any });

    expect(service.buscarConfiguracao).toHaveBeenCalledWith(10);
    expect(component.config()?.status).toBe('NAO_CONFIGURADO');
  });

  it('salva configuracao incompleta enquanto desabilitado', () => {
    const { component, service } = criarComponente();
    component.form.patchValue({ coberturaM2: null, ativo: false });

    component.salvar();

    expect(service.salvarConfiguracao).toHaveBeenCalled();
    const payload = service.salvarConfiguracao.calls.mostRecent().args[1];
    expect(payload.ativo).toBeFalse();
    expect(payload.tipoCalculoMaterial).toBe('REVESTIMENTO_AREA');
  });

  it('bloqueia habilitacao quando a validacao indica produto invalido', () => {
    const { component, service, toastr } = criarComponente();

    component.habilitar();

    expect(service.validarProduto).toHaveBeenCalledWith(10);
    expect(service.habilitarProduto).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalled();
  });

  it('habilita e retorna para returnUrl interno apos salvar quando valido', () => {
    const { component, service, router } = criarComponente({
      habilitarAoSalvar: 'true',
      returnUrl: '/page/calculadora-materiais',
    });
    service.salvarConfiguracao.and.returnValue(of(config({ status: 'PRONTO_PARA_HABILITAR', podeHabilitar: true })));
    service.validarProduto.and.returnValue(of(busca({ status: 'PRONTO_PARA_HABILITAR', podeAdicionar: true })));

    component.salvar();

    expect(service.habilitarProduto).toHaveBeenCalledWith(10);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/calculadora-materiais');
  });

  it('ignora returnUrl externo', () => {
    const { component, service, router } = criarComponente({
      habilitarAoSalvar: 'true',
      returnUrl: 'https://example.com',
    });
    service.salvarConfiguracao.and.returnValue(of(config({ status: 'PRONTO_PARA_HABILITAR', podeHabilitar: true })));
    service.validarProduto.and.returnValue(of(busca({ status: 'PRONTO_PARA_HABILITAR', podeAdicionar: true })));

    component.salvar();

    expect(service.habilitarProduto).toHaveBeenCalledWith(10);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('desabilita pelo endpoint de habilitacao', () => {
    const { component, service } = criarComponente();

    component.desabilitar();

    expect(service.alterarHabilitacao).toHaveBeenCalledWith(10, false);
  });
});

function config(overrides: any = {}) {
  return {
    produtoId: 10,
    tipoCalculoMaterial: 'REVESTIMENTO_AREA',
    unidadeVenda: 'CAIXA',
    embalagem: null,
    percentualPerdaPadrao: null,
    permiteAlterarPercentualPerda: true,
    quantidadeMinimaVenda: null,
    multiploVenda: null,
    ativo: false,
    status: 'NAO_CONFIGURADO',
    pendencias: [{ codigo: 'X', campo: 'coberturaM2', mensagem: 'Informe a cobertura.' }],
    podeHabilitar: false,
    ...overrides,
  };
}

function busca(overrides: any = {}) {
  return {
    produtoId: 10,
    codigo: 'P10',
    nome: 'Produto',
    status: 'CONFIGURACAO_INCOMPLETA',
    podeAdicionar: false,
    deveConfigurar: true,
    pendencias: [{ codigo: 'X', campo: 'coberturaM2', mensagem: 'Informe a cobertura.' }],
    ...overrides,
  };
}
