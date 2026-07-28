import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CalculadoraMaterialProdutoBusca,
  ProdutoCalculadoraMaterialResponse,
} from 'src/app/pages/calculadora-materiais/shared/calculadora-material.models';
import { ApiService } from 'src/app/services/api.service';
import {
  CalculadoraPisoAdicionarOrcamentoRequest,
  CalculadoraPisoAdicionarOrcamentoResponse,
  CalculadoraPisoProduto,
  CalculadoraPisoRequest,
  CalculadoraPisoResultado,
} from './calculadora-pisos.models';

interface CalculadoraMaterialAmbienteRequest {
  nome: string;
  largura: number;
  comprimento: number;
  quantidadeAmbientes: number;
}

interface CalculadoraMaterialRequest {
  produtoId: number;
  percentualPerda: number;
  ambientes: CalculadoraMaterialAmbienteRequest[];
}

interface CalculadoraMaterialResponse {
  produto: {
    id: number;
    codigo: string | null;
    nome: string;
    unidadeVenda?: string | null;
    coberturaM2?: number | null;
  };
  ambientes: Array<{
    nome: string;
    largura: number;
    comprimento: number;
    quantidadeAmbientes: number;
    area: number;
  }>;
  areaTotal: number;
  percentualPerda: number;
  areaPerda: number;
  areaNecessaria: number;
  quantidadeComercial: number;
  areaComprada: number;
  sobraEstimada: number;
  valorUnitario?: number | null;
  valorTotal?: number | null;
}

interface CalculadoraMaterialAdicionarOrcamentoRequest {
  calculo: CalculadoraMaterialRequest;
  observacao: string | null;
}

interface OrcamentoItemResponse {
  id: number;
  orcamentoId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class CalculadoraPisosService {
  private readonly endpoint = 'api/calculadoras/materiais';

  constructor(private readonly api: ApiService) {}

  buscarProdutos(texto: string): Observable<CalculadoraPisoProduto[]> {
    const params = new HttpParams()
      .set('q', texto || '')
      .set('limite', '20');
    return this.api.get<CalculadoraMaterialProdutoBusca[]>(`${this.endpoint}/produtos/disponiveis`, params).pipe(
      map((produtos) => produtos
        .filter((produto) => produto.status === 'HABILITADO')
        .map((produto) => this.mapProdutoBusca(produto)))
    );
  }

  consultarProduto(produtoId: number): Observable<CalculadoraPisoProduto> {
    return this.api.get<ProdutoCalculadoraMaterialResponse>(`${this.endpoint}/produtos/${produtoId}/configuracao`).pipe(
      map((config) => this.mapProdutoConfiguracao(config))
    );
  }

  calcular(request: CalculadoraPisoRequest): Observable<CalculadoraPisoResultado> {
    return this.api.post<CalculadoraMaterialResponse>(`${this.endpoint}/calcular`, this.mapCalculoRequest(request)).pipe(
      map((resultado) => this.mapCalculoResponse(resultado))
    );
  }

  adicionarAoOrcamento(request: CalculadoraPisoAdicionarOrcamentoRequest): Observable<CalculadoraPisoAdicionarOrcamentoResponse> {
    const referencia = this.normalizarReferenciaOrcamento(request.orcamentoReferencia ?? request.orcamentoId);
    if (!referencia) {
      throw new Error('orcamentoReferencia é obrigatória para adicionar item da calculadora.');
    }
    return this.api.post<OrcamentoItemResponse>(
      `${this.endpoint}/orcamentos/referencia/${encodeURIComponent(referencia)}/itens`,
      this.mapAdicionarOrcamentoRequest(request)
    ).pipe(
      map((item) => ({
        pedidoId: item.orcamentoId ?? Number(referencia),
        itemId: item.id,
        mensagem: 'Item adicionado ao orçamento.',
      }))
    );
  }

  private mapProdutoBusca(produto: CalculadoraMaterialProdutoBusca): CalculadoraPisoProduto {
    return {
      id: produto.produtoId,
      codigo: produto.codigo,
      nome: produto.nome,
      ativo: produto.status === 'HABILITADO',
      configurado: produto.status === 'HABILITADO',
      status: produto.status,
      pendencias: produto.pendencias?.map((pendencia) => pendencia.mensagem) || [],
    };
  }

  private mapProdutoConfiguracao(config: ProdutoCalculadoraMaterialResponse): CalculadoraPisoProduto {
    return {
      id: config.produtoId,
      codigo: null,
      nome: '',
      unidadeVenda: config.unidadeVenda || config.embalagem?.unidadeComercial || null,
      metragemPorEmbalagem: config.embalagem?.coberturaM2 ?? null,
      perdaPadraoPercentual: config.percentualPerdaPadrao ?? 0,
      ativo: config.ativo === true && config.status === 'HABILITADO',
      configurado: config.status === 'HABILITADO',
      status: config.status,
      pendencias: config.pendencias?.map((pendencia) => pendencia.mensagem) || [],
    };
  }

  private mapCalculoRequest(request: CalculadoraPisoRequest): CalculadoraMaterialRequest {
    return {
      produtoId: request.produtoId,
      percentualPerda: request.percentualPerda,
      ambientes: request.ambientes.map((ambiente) => ({
        nome: ambiente.nome,
        largura: ambiente.largura,
        comprimento: ambiente.comprimento,
        quantidadeAmbientes: ambiente.quantidade,
      })),
    };
  }

  private mapCalculoResponse(resultado: CalculadoraMaterialResponse): CalculadoraPisoResultado {
    return {
      produto: {
        id: resultado.produto.id,
        codigo: resultado.produto.codigo,
        nome: resultado.produto.nome,
        unidadeVenda: resultado.produto.unidadeVenda,
        metragemPorEmbalagem: resultado.produto.coberturaM2,
        ativo: true,
        configurado: true,
      },
      ambientes: resultado.ambientes.map((ambiente) => ({
        nome: ambiente.nome,
        largura: ambiente.largura,
        comprimento: ambiente.comprimento,
        quantidade: ambiente.quantidadeAmbientes,
        area: ambiente.area,
      })),
      areaTotal: resultado.areaTotal,
      percentualPerda: resultado.percentualPerda,
      areaPerda: resultado.areaPerda,
      areaNecessaria: resultado.areaNecessaria,
      quantidadeCaixas: resultado.quantidadeComercial,
      areaComprada: resultado.areaComprada,
      sobraEstimada: resultado.sobraEstimada,
      valorUnitario: resultado.valorUnitario,
      valorTotal: resultado.valorTotal,
      avisos: [],
    };
  }

  private mapAdicionarOrcamentoRequest(request: CalculadoraPisoAdicionarOrcamentoRequest): CalculadoraMaterialAdicionarOrcamentoRequest {
    const resultado = request.resultado;
    return {
      calculo: this.mapCalculoRequest({
        produtoId: resultado.produto.id,
        percentualPerda: resultado.percentualPerda,
        ambientes: resultado.ambientes,
      }),
      observacao: null,
    };
  }

  private normalizarReferenciaOrcamento(value: string | number | null | undefined): string {
    return String(value ?? '').trim().toUpperCase();
  }
}
