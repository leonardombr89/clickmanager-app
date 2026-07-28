import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { CatalogoProdutoFormComponent } from './catalogo-produto-form.component';

describe('CatalogoProdutoFormComponent Calculadora de Materiais', () => {
  function criarComponente(
    moduloAtivo: boolean,
    permissoes: string[] = ['CALCULADORA_MATERIAIS_CONFIGURAR'],
    tab: string | null = null
  ) {
    const component = new CatalogoProdutoFormComponent(
      new FormBuilder(),
      { detalhar: jasmine.createSpy('detalhar').and.returnValue(of(produto())) } as any,
      { options: jasmine.createSpy('categoriasOptions').and.returnValue(of([])), estruturaProduto: jasmine.createSpy('estruturaProduto').and.returnValue(of({ caracteristicas: [] })) } as any,
      { options: jasmine.createSpy('marcasOptions').and.returnValue(of([])) } as any,
      {
        snapshot: {
          paramMap: { get: (key: string) => key === 'id' ? '10' : null },
          queryParamMap: { get: (key: string) => key === 'tab' ? tab : null },
        },
      } as any,
      {} as any,
      { warning: jasmine.createSpy('warning'), error: jasmine.createSpy('error'), success: jasmine.createSpy('success') } as any,
      { open: jasmine.createSpy('open') } as any,
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
    expect((component as any).abasDisponiveis()).toContain('calculadora-materiais');
  });

  it('oculta aba quando modulo esta inativo', () => {
    const component = criarComponente(false);

    expect(component.exibirAbaCalculadoraMateriais).toBeFalse();
    expect((component as any).abasDisponiveis()).not.toContain('calculadora-materiais');
  });

  it('oculta aba quando usuario nao possui permissao', () => {
    const component = criarComponente(true, []);

    expect(component.exibirAbaCalculadoraMateriais).toBeFalse();
    expect((component as any).abasDisponiveis()).not.toContain('calculadora-materiais');
  });

  it('abre aba calculadora por query param quando disponivel', () => {
    const component = criarComponente(true, ['CALCULADORA_MATERIAIS_CONFIGURAR'], 'calculadora-materiais');

    expect(component.selectedTabIndex).toBe(4);
  });

  it('ignora query param quando modulo nao esta habilitado', () => {
    const component = criarComponente(false, ['CALCULADORA_MATERIAIS_CONFIGURAR'], 'calculadora-materiais');

    expect(component.selectedTabIndex).toBe(0);
  });

  it('mantem produtoId para renderizar o componente da aba', () => {
    const component = criarComponente(true, ['CALCULADORA_MATERIAIS_CONFIGURAR'], 'calculadora-materiais');

    expect(component.produtoId).toBe(10);
    expect(component.exibirAbaCalculadoraMateriais).toBeTrue();
  });

  it('ao salvar com campo comercial invalido navega para Comercial sem depender da aba calculadora', () => {
    const component = criarComponente(true);
    component.form.patchValue({ categoriaId: 1, unidadeVenda: 'UNIDADE' });
    component.form.controls.precoVenda.setValidators([]);
    component.form.controls.precoVenda.updateValueAndValidity({ emitEvent: false });
    (component as any).atualizarValidacaoPreco(false);
    component.form.controls.precoVenda.setValue(null);
    component.selectedTabIndex = 4;

    component.salvar();

    expect(component.selectedTabIndex).toBe(1);
  });
});

function produto() {
  return {
    id: 10,
    codigo: '456',
    nome: 'Produto teste',
    slug: 'produto-teste',
    categoria: null,
    marca: null,
    unidadeVenda: 'UNIDADE',
    ordemExibicao: 0,
    destaque: false,
    ativo: true,
    comercial: null,
    imagens: [],
    caracteristicas: [],
  };
}
