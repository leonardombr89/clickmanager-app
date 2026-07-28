import { FormBuilder } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CalculadoraPisosComponent } from './calculadora-pisos.component';
import { CalculadoraPisoProduto, CalculadoraPisoResultado } from './calculadora-pisos.models';

describe('CalculadoraPisosComponent', () => {
  function criarComponente(permissoes: string[] = ['CALCULADORA_MATERIAIS_USAR', 'ORCAMENTOS_EDITAR']) {
    const service = {
      buscarProdutos: jasmine.createSpy('buscarProdutos').and.returnValue(of([produto()])),
      consultarProduto: jasmine.createSpy('consultarProduto').and.returnValue(of(produto())),
      calcular: jasmine.createSpy('calcular').and.callFake((request: any) => of(resultado({
        produto: produto({ id: request.produtoId }),
        ambientes: request.ambientes.map((ambiente: any) => ({
          nome: ambiente.nome,
          largura: ambiente.largura,
          comprimento: ambiente.comprimento,
          quantidade: ambiente.quantidade,
          area: ambiente.largura * ambiente.comprimento * ambiente.quantidade,
        })),
        areaTotal: request.ambientes.reduce((total: number, ambiente: any) => total + ambiente.largura * ambiente.comprimento * ambiente.quantidade, 0),
      }))),
      adicionarAoOrcamento: jasmine.createSpy('adicionarAoOrcamento').and.returnValue(of({ pedidoId: 99, mensagem: 'Produto adicionado ao orçamento.' })),
    };
    const orcamentoService = {
      criar: jasmine.createSpy('criar').and.returnValue(of({ id: 123 })),
    };
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({ nomeContato: 'Maria Cliente', telefoneContato: '11999999999' }),
      }),
    };
    const router = { navigate: jasmine.createSpy('navigate') };
    const component = new CalculadoraPisosComponent(
      new FormBuilder(),
      service as any,
      { temPermissao: (p: string) => permissoes.includes(p) } as any,
      router as any,
      orcamentoService as any,
      dialog as any
    );
    component.ngOnInit();
    return { component, service, router, orcamentoService, dialog };
  }

  function primeiroItem(component: CalculadoraPisosComponent): any {
    return component.itens(component.ambientes.at(0)).at(0);
  }

  function configurarPrimeiroItem(component: CalculadoraPisosComponent, prod = produto()): any {
    const item = primeiroItem(component);
    item.patchValue({
      produtoBusca: prod,
      produto: prod,
      largura: 2,
      comprimento: 3,
      quantidade: 2,
      percentualPerda: 10,
    });
    return item;
  }

  it('inicia com um ambiente sem produto e sem resumo', () => {
    const { component } = criarComponente();

    expect(component.ambientes.length).toBe(1);
    expect(primeiroItem(component).controls.produto.value).toBeNull();
    expect(component.resumoConsolidado).toBeNull();
  });

  it('não permite adicionar ambiente enquanto existir ambiente incompleto', () => {
    const { component } = criarComponente();

    component.addAmbiente();

    expect(component.ambientes.length).toBe(1);
    expect(component.podeAdicionarAmbiente).toBeFalse();
    expect(component.erro).toContain('Conclua o ambiente atual');
  });

  it('bloqueia cálculo para produto incompleto', () => {
    const { component } = criarComponente();
    const item = configurarPrimeiroItem(component, produto({ metragemPorEmbalagem: null }));

    expect(component.itemProntoParaCalculo(item)).toBeFalse();
    expect(component.produtoPendente(item)).toBeTrue();
  });

  it('calcula ambiente com produto próprio usando largura e comprimento', () => {
    const { component, service } = criarComponente();
    configurarPrimeiroItem(component);

    component.calcular();

    expect(service.calcular).toHaveBeenCalledWith(jasmine.objectContaining({
      produtoId: 10,
      ambientes: [jasmine.objectContaining({ nome: 'Ambiente 1', largura: 2, comprimento: 3, quantidade: 2 })],
    }));
    expect(component.resultadoItem(primeiroItem(component))?.areaTotal).toBe(12);
  });

  it('alterna item para área total sem exigir largura e comprimento', () => {
    const { component, service } = criarComponente();
    const item = configurarPrimeiroItem(component);
    item.patchValue({ modoMedicao: 'AREA_TOTAL', areaTotal: 33.1, quantidade: 1, largura: null, comprimento: null });

    component.calcular();

    expect(service.calcular).toHaveBeenCalledWith(jasmine.objectContaining({
      ambientes: [jasmine.objectContaining({ nome: 'Ambiente 1', largura: 33.1, comprimento: 1, quantidade: 1 })],
    }));
  });

  it('carrega configuração e aplica perda padrão no item selecionado', () => {
    const { component, service } = criarComponente();
    service.consultarProduto.and.returnValue(of(produto({
      codigo: null,
      nome: '',
      metragemPorEmbalagem: 2.5,
      perdaPadraoPercentual: 8,
    })));
    const ambiente = component.ambientes.at(0);
    const item = primeiroItem(component);

    component.selecionarProduto(ambiente, item, produto({ codigo: 'P20', nome: 'Piso Cristal' }));

    expect(service.consultarProduto).toHaveBeenCalledWith(10);
    expect(item.controls.produto.value.codigo).toBe('P20');
    expect(item.controls.produto.value.nome).toBe('Piso Cristal');
    expect(item.controls.produto.value.metragemPorEmbalagem).toBe(2.5);
    expect(item.controls.percentualPerda.value).toBe(8);
  });

  it('duplica e remove ambiente preservando produto e medidas', () => {
    const { component } = criarComponente();
    configurarPrimeiroItem(component);

    component.duplicarAmbiente(0);

    expect(component.ambientes.length).toBe(2);
    expect(primeiroItem(component).controls.produto.value.id).toBe(10);

    component.removerAmbiente(1);
    expect(component.ambientes.length).toBe(1);
  });

  it('mantém apenas um ambiente aberto e recolhe o anterior', () => {
    const { component } = criarComponente();
    configurarPrimeiroItem(component);

    component.addAmbiente();

    expect(component.ambientes.at(0).controls.expandido.value).toBeFalse();
    expect(component.ambientes.at(1).controls.expandido.value).toBeTrue();

    component.toggleAmbiente(component.ambientes.at(0));

    expect(component.ambientes.at(0).controls.expandido.value).toBeTrue();
    expect(component.ambientes.at(1).controls.expandido.value).toBeFalse();
  });

  it('abre automaticamente o primeiro ambiente incompleto', () => {
    const { component } = criarComponente();
    configurarPrimeiroItem(component);
    component.addAmbiente();

    expect(component.ambientes.at(1).controls.expandido.value).toBeTrue();
    expect(component.ambientes.at(0).controls.expandido.value).toBeFalse();
  });

  it('troca o produto sem apagar as medidas do ambiente', () => {
    const { component } = criarComponente();
    const item = configurarPrimeiroItem(component);

    component.trocarProduto(item);

    expect(item.controls.produto.value).toBeNull();
    expect(item.controls.largura.value).toBe(2);
    expect(item.controls.comprimento.value).toBe(3);
    expect(component.itemTrocandoProduto(item)).toBeTrue();
  });

  it('abre a lista completa e aplica o produto escolhido', () => {
    const { component, dialog, service } = criarComponente();
    const ambiente = component.ambientes.at(0);
    const item = primeiroItem(component);
    const escolhido = produto({ id: 20, nome: 'Revestimento escolhido' });
    dialog.open.and.returnValue({ afterClosed: () => of(escolhido) });

    component.abrirTodosProdutos(ambiente, item);

    expect(dialog.open).toHaveBeenCalled();
    expect(service.consultarProduto).toHaveBeenCalledWith(20);
    expect(item.controls.produto.value.nome).toBe('Revestimento escolhido');
  });

  it('mostra perda personalizada somente para a opção Outro', () => {
    const { component } = criarComponente();
    const item = primeiroItem(component);

    component.selecionarPerda(item, 10);
    expect(component.perdaPersonalizada(item)).toBeFalse();
    expect(item.controls.percentualPerda.value).toBe(10);

    component.selecionarPerda(item, 'OUTRO');
    expect(component.perdaPersonalizada(item)).toBeTrue();
  });

  it('mantém detalhes do cálculo recolhidos por padrão', () => {
    const { component } = criarComponente();
    const item = primeiroItem(component);

    expect(component.detalhesAbertos(item)).toBeFalse();
    component.toggleDetalhes(item);
    expect(component.detalhesAbertos(item)).toBeTrue();
  });

  it('expande ambientes do produto no resumo por ação explícita', () => {
    const { component } = criarComponente();

    expect(component.produtoResumoAberto(10)).toBeFalse();
    component.toggleProdutoResumo(10);
    expect(component.produtoResumoAberto(10)).toBeTrue();
  });

  it('calcula automaticamente após alterações válidas', fakeAsync(() => {
    const { component, service } = criarComponente();
    configurarPrimeiroItem(component);

    tick(651);

    expect(service.calcular).toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  it('calcula automaticamente e consolida todos os ambientes válidos', fakeAsync(() => {
    const { component, service } = criarComponente();
    configurarPrimeiroItem(component);
    component.addAmbiente({
      nome: 'Cozinha',
      produto: produto(),
      largura: 4,
      comprimento: 3,
      quantidade: 1,
      percentualPerda: 10,
    });

    tick(651);

    const chamadaConsolidada = service.calcular.calls.allArgs().find((args) => args[0].ambientes.length === 2);
    expect(chamadaConsolidada).toBeTruthy();
    expect(component.resumoConsolidado?.ambientes).toBe(2);
    expect(component.calculando).toBeFalse();
    component.ngOnDestroy();
  }));

  it('refaz o cálculo consolidado quando um ambiente muda durante uma requisição', fakeAsync(() => {
    const { component, service } = criarComponente();
    configurarPrimeiroItem(component);
    component.addAmbiente({
      nome: 'Cozinha',
      produto: produto(),
      largura: 4,
      comprimento: 3,
      quantidade: 1,
      percentualPerda: 10,
    });
    const primeiraResposta = new Subject<CalculadoraPisoResultado>();
    const segundaResposta = new Subject<CalculadoraPisoResultado>();
    let chamada = 0;
    service.calcular.and.callFake((request: any) => {
      chamada += 1;
      if (chamada === 1) return primeiraResposta;
      if (chamada === 2) return segundaResposta;
      return of(resultado({
        produto: produto({ id: request.produtoId }),
        ambientes: request.ambientes.map((ambiente: any) => ({
          ...ambiente,
          area: ambiente.largura * ambiente.comprimento * ambiente.quantidade,
        })),
      }));
    });

    component.calcular();
    component.itens(component.ambientes.at(1)).at(0).controls.largura.setValue(5);
    tick(651);

    primeiraResposta.next(resultado());
    primeiraResposta.complete();
    segundaResposta.next(resultado());
    segundaResposta.complete();
    tick(651);

    expect(service.calcular.calls.count()).toBeGreaterThan(2);
    expect(component.calculando).toBeFalse();
    expect(component.resultadoDesatualizado).toBeFalse();
    component.ngOnDestroy();
  }));

  it('consolida o mesmo produto em vários ambientes usando um cálculo agrupado', () => {
    const { component, service } = criarComponente();
    configurarPrimeiroItem(component);
    component.addAmbiente({ nome: 'Cozinha', produto: produto(), largura: 2, comprimento: 2, quantidade: 1, percentualPerda: 10 });

    component.calcular();

    const chamadaAgrupada = service.calcular.calls.allArgs().find((args) => args[0].ambientes.length === 2);
    expect(chamadaAgrupada).toBeTruthy();
    expect(component.resumoConsolidado?.produtosDiferentes).toBe(1);
  });

  it('mantém produtos diferentes separados no resumo', () => {
    const { component } = criarComponente();
    configurarPrimeiroItem(component, produto({ id: 10, nome: 'Porcelanato Delta' }));
    component.addAmbiente({
      nome: 'Banheiro',
      produto: produto({ id: 20, nome: 'Revestimento Urban' }),
      largura: 1,
      comprimento: 2,
      quantidade: 1,
      percentualPerda: 10,
    });

    component.calcular();

    expect(component.resumoConsolidado?.produtosDiferentes).toBe(2);
  });

  it('adiciona ao orçamento existente usando referência alfanumérica', () => {
    const { component, service, router } = criarComponente();
    configurarPrimeiroItem(component);
    component.calcular();
    component.orcamentoReferencia.setValue('SL-20260724-000010');

    component.adicionarAoOrcamento();

    expect(service.adicionarAoOrcamento).toHaveBeenCalledWith(jasmine.objectContaining({
      orcamentoReferencia: 'SL-20260724-000010',
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/page/orcamentos', 99]);
  });

  it('cria novo orçamento com itens separados por produto consolidado', () => {
    const { component, orcamentoService, router, dialog } = criarComponente(['CALCULADORA_MATERIAIS_USAR', 'ORCAMENTOS_CRIAR']);
    configurarPrimeiroItem(component, produto({ id: 10, nome: 'Porcelanato Delta' }));
    component.addAmbiente({
      nome: 'Banheiro',
      produto: produto({ id: 20, nome: 'Revestimento Urban' }),
      largura: 1,
      comprimento: 2,
      quantidade: 1,
      percentualPerda: 10,
    });
    component.calcular();
    component.modoOrcamento.setValue('NOVO');

    component.adicionarAoOrcamento();

    expect(dialog.open).toHaveBeenCalled();
    expect(orcamentoService.criar).toHaveBeenCalledWith(jasmine.objectContaining({
      nomeContato: 'Maria Cliente',
      telefoneContato: '11999999999',
      itens: [
        jasmine.objectContaining({ tipoItem: 'CATALOGO', produtoId: 10 }),
        jasmine.objectContaining({ tipoItem: 'CATALOGO', produtoId: 20 }),
      ],
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/page/orcamentos', 123]);
  });

  it('preserva campos e mostra erro quando cálculo falha', () => {
    const { component, service } = criarComponente();
    const item = configurarPrimeiroItem(component);
    service.calcular.and.returnValue(throwError(() => new Error('falha')));

    component.calcular();

    expect(component.erro).toContain('Alguns itens não puderam ser calculados');
    expect(item.controls.largura.value).toBe(2);
  });

  it('não inventa total nem permite orçamento quando o backend não retorna preço', () => {
    const { component, service } = criarComponente();
    const item = configurarPrimeiroItem(component, produto({ precoUnitario: 199.9 }));
    service.calcular.and.callFake((request: any) => of(resultado({
      produto: produto({ id: request.produtoId, precoUnitario: 199.9 }),
      ambientes: request.ambientes,
      valorUnitario: null,
      valorTotal: null,
    })));

    component.calcular();

    expect(component.precoItem(item)).toBeNull();
    expect(component.totalItem(item)).toBeNull();
    expect(component.resumoConsolidado?.valorTotal).toBeNull();
    expect(component.podeAdicionarResultado).toBeFalse();
  });

  it('formata singular e plural de caixas', () => {
    const { component } = criarComponente();

    expect(component.pluralUnidade(1)).toBe('1 caixa');
    expect(component.pluralUnidade(2)).toBe('2 caixas');
  });
});

function produto(overrides: Partial<CalculadoraPisoProduto> = {}): CalculadoraPisoProduto {
  return {
    id: 10,
    codigo: 'P10',
    nome: 'Porcelanato Delta 60x60',
    categoria: 'Pisos',
    marca: 'Delta',
    unidadeVenda: 'CAIXA',
    metragemPorEmbalagem: 2.04,
    precoUnitario: 119.9,
    perdaPadraoPercentual: 10,
    ativo: true,
    configurado: true,
    ...overrides,
  };
}

function resultado(overrides: Partial<CalculadoraPisoResultado> = {}): CalculadoraPisoResultado {
  return {
    produto: produto(),
    ambientes: [{ nome: 'Ambiente 1', largura: 2, comprimento: 3, quantidade: 2, area: 12 }],
    areaTotal: 12,
    percentualPerda: 10,
    areaPerda: 1.2,
    areaNecessaria: 13.2,
    quantidadeCaixas: 6,
    areaComprada: 12.24,
    sobraEstimada: 0.31,
    valorUnitario: 119.9,
    valorTotal: 719.4,
    avisos: [],
    ...overrides,
  };
}
