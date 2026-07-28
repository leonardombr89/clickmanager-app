export type TipoCalculoMaterial = 'REVESTIMENTO_AREA';

export type StatusConfiguracaoCalculadoraMaterial =
  | 'NAO_CONFIGURADO'
  | 'CONFIGURACAO_INCOMPLETA'
  | 'PRONTO_PARA_HABILITAR'
  | 'HABILITADO'
  | 'PRODUTO_INATIVO'
  | 'PRECO_NAO_CONFIGURADO';

export type CalculadoraMaterialUnidadeComercial =
  | 'UNIDADE'
  | 'METRO'
  | 'METRO_QUADRADO'
  | 'METRO_CUBICO'
  | 'CAIXA'
  | 'PACOTE'
  | 'SACO'
  | 'LITRO'
  | 'MILILITRO'
  | 'QUILOGRAMA'
  | 'GRAMA'
  | 'PAR'
  | 'JOGO'
  | 'ROLO';

export type CalculadoraMaterialUnidadeDimensao = 'METRO' | 'CENTIMETRO' | 'MILIMETRO';

export interface CalculadoraMaterialPendencia {
  codigo: string;
  campo: string;
  mensagem: string;
}

export interface CalculadoraMaterialEmbalagem {
  unidadeComercial: CalculadoraMaterialUnidadeComercial | null;
  pecasPorEmbalagem: number | null;
  coberturaM2: number | null;
  larguraPeca: number | null;
  comprimentoPeca: number | null;
  unidadeDimensao: CalculadoraMaterialUnidadeDimensao | null;
}

export interface ProdutoCalculadoraMaterialRequest {
  tipoCalculoMaterial: TipoCalculoMaterial | null;
  embalagem: CalculadoraMaterialEmbalagem | null;
  percentualPerdaPadrao: number | null;
  permiteAlterarPercentualPerda: boolean | null;
  quantidadeMinimaVenda: number | null;
  multiploVenda: number | null;
  ativo: boolean | null;
}

export interface ProdutoCalculadoraMaterialResponse {
  produtoId: number;
  tipoCalculoMaterial: TipoCalculoMaterial | null;
  unidadeVenda: string | null;
  embalagem: CalculadoraMaterialEmbalagem | null;
  percentualPerdaPadrao: number | null;
  permiteAlterarPercentualPerda: boolean | null;
  quantidadeMinimaVenda: number | null;
  multiploVenda: number | null;
  ativo: boolean | null;
  status: StatusConfiguracaoCalculadoraMaterial;
  pendencias: CalculadoraMaterialPendencia[];
  podeHabilitar: boolean;
}

export interface CalculadoraMaterialHabilitacaoRequest {
  ativo: boolean;
}

export interface CalculadoraMaterialProdutoBusca {
  produtoId: number;
  codigo: string | null;
  nome: string;
  status: StatusConfiguracaoCalculadoraMaterial;
  podeAdicionar: boolean;
  deveConfigurar: boolean;
  pendencias: CalculadoraMaterialPendencia[];
}

export const CALCULADORA_MATERIAIS_PERMISSAO_CONFIGURAR = 'CALCULADORA_MATERIAIS_CONFIGURAR';
export const CALCULADORA_MATERIAIS_PERMISSAO_USAR = 'CALCULADORA_MATERIAIS_USAR';
export const CALCULADORA_MATERIAIS_MODULO = 'CALCULADORA_MATERIAIS';
