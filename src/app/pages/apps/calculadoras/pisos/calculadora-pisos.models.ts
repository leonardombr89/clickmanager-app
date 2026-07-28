export interface CalculadoraPisoProduto {
  id: number;
  codigo: string | null;
  nome: string;
  categoria?: string | null;
  marca?: string | null;
  unidadeVenda?: string | null;
  imagemUrl?: string | null;
  metragemPorEmbalagem?: number | null;
  precoUnitario?: number | null;
  perdaPadraoPercentual?: number | null;
  ativo?: boolean | null;
  configurado?: boolean | null;
  status?: string | null;
  pendencias?: string[];
}

export interface CalculadoraPisoAmbienteRequest {
  nome: string;
  largura: number;
  comprimento: number;
  quantidade: number;
}

export type CalculadoraPisoModoArea = 'MEDIDAS' | 'AREA_TOTAL';

export interface CalculadoraPisoRequest {
  produtoId: number;
  percentualPerda: number;
  ambientes: CalculadoraPisoAmbienteRequest[];
}

export interface CalculadoraPisoAmbienteResultado extends CalculadoraPisoAmbienteRequest {
  area: number;
}

export interface CalculadoraPisoResultado {
  produto: CalculadoraPisoProduto;
  ambientes: CalculadoraPisoAmbienteResultado[];
  areaTotal: number;
  percentualPerda: number;
  areaPerda: number;
  areaNecessaria: number;
  quantidadeCaixas: number;
  areaComprada: number;
  sobraEstimada: number;
  valorUnitario?: number | null;
  valorTotal?: number | null;
  avisos?: string[];
}

export type CalculadoraMaterialModoMedicao = 'MEDIDAS' | 'AREA_TOTAL';

export interface CalculadoraMaterialItemResumo {
  id: string;
  ambienteId: string;
  ambienteNome: string;
  produto: CalculadoraPisoProduto;
  resultado: CalculadoraPisoResultado;
}

export interface CalculadoraMaterialProdutoConsolidado {
  produto: CalculadoraPisoProduto;
  ambientes: string[];
  resultados: CalculadoraPisoResultado[];
  quantidadeCaixas: number;
  areaTotal: number;
  areaNecessaria: number;
  areaComprada: number;
  sobraEstimada: number;
  valorUnitario?: number | null;
  valorTotal?: number | null;
}

export interface CalculadoraMaterialResumoConsolidado {
  ambientes: number;
  produtos: CalculadoraMaterialProdutoConsolidado[];
  produtosDiferentes: number;
  quantidadeCaixas: number;
  areaTotal: number;
  valorTotal: number | null;
}

export interface CalculadoraPisoAdicionarOrcamentoRequest {
  orcamentoReferencia?: string | null;
  orcamentoId?: number | null;
  criarNovoOrcamento?: boolean;
  resultado: CalculadoraPisoResultado;
}

export interface CalculadoraPisoAdicionarOrcamentoResponse {
  pedidoId: number;
  itemId?: number | null;
  mensagem?: string | null;
}
