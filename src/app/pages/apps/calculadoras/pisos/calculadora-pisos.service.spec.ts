import { of } from 'rxjs';
import { CalculadoraPisosService } from './calculadora-pisos.service';

describe('CalculadoraPisosService', () => {
  function criarService() {
    const api = {
      get: jasmine.createSpy('get'),
      post: jasmine.createSpy('post'),
    };
    return { service: new CalculadoraPisosService(api as any), api };
  }

  it('pesquisa produtos no endpoint da Calculadora de Materiais', (done) => {
    const { service, api } = criarService();
    api.get.and.returnValue(of([
      {
        produtoId: 10,
        codigo: 'P10',
        nome: 'Porcelanato',
        status: 'HABILITADO',
        podeAdicionar: true,
        deveConfigurar: false,
        pendencias: [],
      },
      {
        produtoId: 11,
        codigo: 'P11',
        nome: 'Produto incompleto',
        status: 'CONFIGURACAO_INCOMPLETA',
        podeAdicionar: false,
        deveConfigurar: true,
        pendencias: [{ codigo: 'COBERTURA', campo: 'coberturaM2', mensagem: 'Informe cobertura.' }],
      },
    ]));

    service.buscarProdutos('porc').subscribe((produtos) => {
      expect(api.get.calls.mostRecent().args[0]).toBe('api/calculadoras/materiais/produtos/disponiveis');
      expect(produtos.length).toBe(1);
      expect(produtos[0]).toEqual(jasmine.objectContaining({
        id: 10,
        codigo: 'P10',
        nome: 'Porcelanato',
        ativo: true,
        configurado: true,
      }));
      done();
    });
  });

  it('permite buscar produtos sem texto para listar opções iniciais', (done) => {
    const { service, api } = criarService();
    api.get.and.returnValue(of([
      {
        produtoId: 10,
        codigo: 'P10',
        nome: 'Porcelanato',
        status: 'HABILITADO',
        podeAdicionar: true,
        deveConfigurar: false,
        pendencias: [],
      },
    ]));

    service.buscarProdutos('').subscribe((produtos) => {
      const params = api.get.calls.mostRecent().args[1];
      expect(api.get.calls.mostRecent().args[0]).toBe('api/calculadoras/materiais/produtos/disponiveis');
      expect(params.get('q')).toBe('');
      expect(produtos.length).toBe(1);
      done();
    });
  });

  it('carrega a configuração do produto selecionado no endpoint novo', (done) => {
    const { service, api } = criarService();
    api.get.and.returnValue(of({
      produtoId: 10,
      unidadeVenda: 'CAIXA',
      embalagem: { coberturaM2: 2.04, unidadeComercial: 'CAIXA' },
      percentualPerdaPadrao: 12,
      ativo: true,
      status: 'HABILITADO',
      pendencias: [],
    }));

    service.consultarProduto(10).subscribe((produto) => {
      expect(api.get.calls.mostRecent().args[0]).toBe('api/calculadoras/materiais/produtos/10/configuracao');
      expect(produto.metragemPorEmbalagem).toBe(2.04);
      expect(produto.perdaPadraoPercentual).toBe(12);
      expect(produto.unidadeVenda).toBe('CAIXA');
      done();
    });
  });

  it('calcula usando o payload e response da Calculadora de Materiais', (done) => {
    const { service, api } = criarService();
    api.post.and.returnValue(of({
      produto: {
        id: 10,
        codigo: 'P10',
        nome: 'Porcelanato',
        unidadeVenda: 'CAIXA',
        coberturaM2: 2.04,
      },
      ambientes: [{
        nome: 'Ambiente 1',
        largura: 2,
        comprimento: 3,
        quantidadeAmbientes: 2,
        area: 12,
      }],
      areaTotal: 12,
      percentualPerda: 10,
      areaPerda: 1.2,
      areaNecessaria: 13.2,
      quantidadeComercial: 7,
      areaComprada: 14.28,
      sobraEstimada: 1.08,
      valorUnitario: 119.9,
      valorTotal: 839.3,
    }));

    service.calcular({
      produtoId: 10,
      percentualPerda: 10,
      ambientes: [{ nome: 'Ambiente 1', largura: 2, comprimento: 3, quantidade: 2 }],
    }).subscribe((resultado) => {
      expect(api.post.calls.mostRecent().args[0]).toBe('api/calculadoras/materiais/calcular');
      expect(api.post.calls.mostRecent().args[1]).toEqual({
        produtoId: 10,
        percentualPerda: 10,
        ambientes: [{ nome: 'Ambiente 1', largura: 2, comprimento: 3, quantidadeAmbientes: 2 }],
      });
      expect(resultado.quantidadeCaixas).toBe(7);
      expect(resultado.ambientes[0].quantidade).toBe(2);
      expect(resultado.produto.metragemPorEmbalagem).toBe(2.04);
      done();
    });
  });

  it('adiciona o cálculo em um orçamento existente pelo endpoint de materiais', (done) => {
    const { service, api } = criarService();
    api.post.and.returnValue(of({ id: 55, orcamentoId: 99 }));

    service.adicionarAoOrcamento({
      orcamentoReferencia: 'SL-20260724-000010',
      resultado: {
        produto: {
          id: 10,
          codigo: 'P10',
          nome: 'Porcelanato',
        },
        ambientes: [{ nome: 'Ambiente 1', largura: 2, comprimento: 3, quantidade: 2, area: 12 }],
        areaTotal: 12,
        percentualPerda: 10,
        areaPerda: 1.2,
        areaNecessaria: 13.2,
        quantidadeCaixas: 7,
        areaComprada: 14.28,
        sobraEstimada: 1.08,
      },
    }).subscribe((response) => {
      expect(api.post.calls.mostRecent().args[0]).toBe('api/calculadoras/materiais/orcamentos/referencia/SL-20260724-000010/itens');
      expect(api.post.calls.mostRecent().args[1]).toEqual({
        calculo: {
          produtoId: 10,
          percentualPerda: 10,
          ambientes: [{ nome: 'Ambiente 1', largura: 2, comprimento: 3, quantidadeAmbientes: 2 }],
        },
        observacao: null,
      });
      expect(response).toEqual({ pedidoId: 99, itemId: 55, mensagem: 'Item adicionado ao orçamento.' });
      done();
    });
  });
});
