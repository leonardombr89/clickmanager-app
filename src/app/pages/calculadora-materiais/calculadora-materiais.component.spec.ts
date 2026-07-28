import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { CalculadoraMateriaisComponent } from './calculadora-materiais.component';

describe('CalculadoraMateriaisComponent', () => {
  function criarComponente() {
    const service = {
      listarHabilitados: jasmine.createSpy('listarHabilitados').and.returnValue(of([produto({ status: 'HABILITADO', podeAdicionar: true })])),
      pesquisarDisponiveis: jasmine.createSpy('pesquisarDisponiveis').and.returnValue(of([produto()])),
      validarProduto: jasmine.createSpy('validarProduto').and.returnValue(of(produto({ status: 'PRONTO_PARA_HABILITAR', podeAdicionar: true }))),
      habilitarProduto: jasmine.createSpy('habilitarProduto').and.returnValue(of({ produtoId: 10 })),
      alterarHabilitacao: jasmine.createSpy('alterarHabilitacao').and.returnValue(of({ produtoId: 10 })),
    };
    const router = { navigate: jasmine.createSpy('navigate') };
    const toastr = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning'),
    };
    const component = new CalculadoraMateriaisComponent(new FormBuilder(), service as any, router as any, toastr as any);
    return { component, service, router };
  }

  it('carrega habilitados e disponiveis', () => {
    const { component, service } = criarComponente();

    component.ngOnInit();

    expect(service.listarHabilitados).toHaveBeenCalled();
    expect(service.pesquisarDisponiveis).toHaveBeenCalledWith('', 20);
    expect(component.habilitados().length).toBe(1);
  });

  it('habilita diretamente produto pronto e atualiza listas sem redirecionar', () => {
    const { component, service, router } = criarComponente();

    component.adicionarProduto(produto({ status: 'PRONTO_PARA_HABILITAR', podeAdicionar: true }));

    expect(service.validarProduto).toHaveBeenCalledWith(10);
    expect(service.habilitarProduto).toHaveBeenCalledWith(10);
    expect(service.listarHabilitados).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('mostra pendencias e redireciona para configurar produto incompleto', () => {
    const { component, service, router } = criarComponente();
    service.validarProduto.and.returnValue(of(produto({ status: 'CONFIGURACAO_INCOMPLETA', podeAdicionar: false, deveConfigurar: true })));

    component.adicionarProduto(produto());

    expect(component.produtoComPendencias()?.status).toBe('CONFIGURACAO_INCOMPLETA');

    component.configurarProduto(component.produtoComPendencias()!);

    expect(router.navigate).toHaveBeenCalledWith(['/page/cadastro-tecnico/produtos/editar', 10], {
      queryParams: {
        tab: 'calculadora-materiais',
        returnUrl: '/page/calculadora-materiais',
        habilitarAoSalvar: true,
      },
    });
  });

  it('desabilita produto e recarrega listas', () => {
    const { component, service } = criarComponente();

    component.desabilitar(produto({ status: 'HABILITADO' }));

    expect(service.alterarHabilitacao).toHaveBeenCalledWith(10, false);
    expect(service.listarHabilitados).toHaveBeenCalled();
  });
});

function produto(overrides: any = {}) {
  return {
    produtoId: 10,
    codigo: 'P10',
    nome: 'Produto',
    status: 'NAO_CONFIGURADO',
    podeAdicionar: false,
    deveConfigurar: true,
    pendencias: [{ codigo: 'X', campo: 'coberturaM2', mensagem: 'Informe a cobertura.' }],
    ...overrides,
  };
}
