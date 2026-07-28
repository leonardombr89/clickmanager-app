import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { FormProdutoComponent } from './form-produto.component';

describe('FormProdutoComponent Calculadora de Materiais', () => {
  function criarComponente(
    moduloAtivo: boolean,
    permissoes: string[] = ['CALCULADORA_MATERIAIS_CONFIGURAR'],
    tab: string | null = null
  ) {
    const route = {
      paramMap: of(new Map([['id', '10']])),
      snapshot: {
        queryParamMap: {
          get: (key: string) => key === 'tab' ? tab : null,
        },
      },
    };
    const produtoService = {
      buscarPorId: jasmine.createSpy('buscarPorId').and.returnValue(of({
        nome: 'Produto teste',
        descricao: 'Descricao teste',
        variacoes: [],
        politicaRevenda: null,
      })),
    };
    const component = new FormProdutoComponent(
      new FormBuilder(),
      route as any,
      {} as any,
      produtoService as any,
      {} as any,
      { markForCheck: () => undefined } as any,
      { temPermissao: (p: string) => permissoes.includes(p) } as any,
      {
        carregar: () => of({ CALCULADORA_MATERIAIS: moduloAtivo }),
        isEnabled: (key: string) => key === 'CALCULADORA_MATERIAIS' && moduloAtivo,
      } as any
    );
    component.ngOnInit();
    return component;
  }

  it('exibe aba quando modulo e permissao estao ativos', () => {
    const component = criarComponente(true);

    expect(component.exibirAbaCalculadoraMateriais).toBeTrue();
    expect(component.wizardSteps.some((step) => step.key === 'calculadora-materiais')).toBeTrue();
  });

  it('oculta aba quando modulo esta inativo', () => {
    const component = criarComponente(false);

    expect(component.exibirAbaCalculadoraMateriais).toBeFalse();
    expect(component.wizardSteps.some((step) => step.key === 'calculadora-materiais')).toBeFalse();
  });

  it('oculta aba quando usuario nao possui permissao', () => {
    const component = criarComponente(true, []);

    expect(component.exibirAbaCalculadoraMateriais).toBeFalse();
    expect(component.wizardSteps.some((step) => step.key === 'calculadora-materiais')).toBeFalse();
  });

  it('abre aba calculadora por query param quando disponivel', () => {
    const component = criarComponente(true, ['CALCULADORA_MATERIAIS_CONFIGURAR'], 'calculadora-materiais');

    expect(component.currentStepKey).toBe('calculadora-materiais');
    expect(component.currentStep).toBe(component.calculadoraMateriaisStep);
  });

  it('ignora query param quando modulo nao esta habilitado', () => {
    const component = criarComponente(false, ['CALCULADORA_MATERIAIS_CONFIGURAR'], 'calculadora-materiais');

    expect(component.currentStepKey).toBe('produto');
  });

  it('participa da navegacao anterior e proximo sem indice fixo', () => {
    const component = criarComponente(true);
    component.form.patchValue({ nome: 'Produto teste', descricao: 'Descricao teste' });
    component.variacoes = [{ materialId: 1, preco: { tipo: 'FIXO', valor: 10 } } as any];

    component.goToStep(component.revisaoStep);
    component.nextStep();
    expect(component.currentStepKey).toBe('calculadora-materiais');

    component.previousStep();
    expect(component.currentStepKey).toBe('revisao');
  });

  it('mantem produtoId para renderizar o componente da aba', () => {
    const component = criarComponente(true, ['CALCULADORA_MATERIAIS_CONFIGURAR'], 'calculadora-materiais');

    expect(component.produtoId).toBe(10);
    expect(component.currentStep === component.calculadoraMateriaisStep && component.exibirAbaCalculadoraMateriais).toBeTrue();
  });
});
