import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  CalculadoraMaterialHabilitacaoRequest,
  CalculadoraMaterialProdutoBusca,
  ProdutoCalculadoraMaterialRequest,
  ProdutoCalculadoraMaterialResponse,
} from './calculadora-material.models';

@Injectable({ providedIn: 'root' })
export class CalculadoraMaterialService {
  private readonly endpoint = 'api/calculadoras/materiais';

  constructor(private readonly api: ApiService) {}

  buscarConfiguracao(produtoId: number): Observable<ProdutoCalculadoraMaterialResponse> {
    return this.api.get<ProdutoCalculadoraMaterialResponse>(`${this.endpoint}/produtos/${produtoId}/configuracao`);
  }

  salvarConfiguracao(produtoId: number, request: ProdutoCalculadoraMaterialRequest): Observable<ProdutoCalculadoraMaterialResponse> {
    return this.api.put<ProdutoCalculadoraMaterialResponse>(`${this.endpoint}/produtos/${produtoId}/configuracao`, request);
  }

  alterarHabilitacao(produtoId: number, ativo: boolean): Observable<ProdutoCalculadoraMaterialResponse> {
    const request: CalculadoraMaterialHabilitacaoRequest = { ativo };
    return this.api.patch<ProdutoCalculadoraMaterialResponse>(`${this.endpoint}/produtos/${produtoId}/habilitacao`, request);
  }

  listarHabilitados(): Observable<CalculadoraMaterialProdutoBusca[]> {
    return this.api.get<CalculadoraMaterialProdutoBusca[]>(`${this.endpoint}/produtos/habilitados`);
  }

  pesquisarDisponiveis(q = '', limite = 20): Observable<CalculadoraMaterialProdutoBusca[]> {
    const params = new HttpParams()
      .set('q', q)
      .set('limite', String(limite));
    return this.api.get<CalculadoraMaterialProdutoBusca[]>(`${this.endpoint}/produtos/disponiveis`, params);
  }

  validarProduto(produtoId: number): Observable<CalculadoraMaterialProdutoBusca> {
    return this.api.get<CalculadoraMaterialProdutoBusca>(`${this.endpoint}/produtos/${produtoId}/validacao`);
  }

  habilitarProduto(produtoId: number): Observable<ProdutoCalculadoraMaterialResponse> {
    return this.api.post<ProdutoCalculadoraMaterialResponse>(`${this.endpoint}/produtos/${produtoId}/habilitar`, {});
  }
}
