export type ClickTvTipoMidia = 'IMAGEM' | 'VIDEO';
export type ClickTvStatusMidia = 'PROCESSANDO' | 'DISPONIVEL' | 'ERRO' | 'ARQUIVADA';
export type ClickTvOrientacao = 'HORIZONTAL' | 'VERTICAL' | 'QUADRADA' | 'INDEFINIDA';
export type ClickTvStatusTela = 'AGUARDANDO_ATIVACAO' | 'ONLINE' | 'OFFLINE' | 'DESATIVADA';

export interface ClickTvPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ClickTvMidia {
  id: number;
  nome: string;
  tipo: ClickTvTipoMidia;
  status: ClickTvStatusMidia;
  orientacao: ClickTvOrientacao;
  duracaoSegundos?: number | null;
  nomeArquivoOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  largura?: number | null;
  altura?: number | null;
  criadoEm: string;
  atualizadoEm: string;
  visualizacao?: { url: string; expiraEm: string } | null;
}

export interface ClickTvMidiaUtilizacao {
  playlistId: number;
  nome: string;
  ativa: boolean;
  quantidadeItens: number;
  versao: number;
}

export interface ClickTvPlaylistResumo {
  id: number;
  nome: string;
  descricao?: string | null;
  orientacao: ClickTvOrientacao;
  ativa: boolean;
  versao: number;
  quantidadeItens: number;
  quantidadeItensAtivos: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ClickTvPlaylistItem {
  id: number;
  ordem: number;
  duracaoSegundos?: number | null;
  ativo: boolean;
  midiaId: number;
  midiaNome: string;
  midiaTipo: ClickTvTipoMidia;
  midiaOrientacao: ClickTvOrientacao;
  midiaStatus: ClickTvStatusMidia;
}

export interface ClickTvPlaylistDetalhe extends Omit<ClickTvPlaylistResumo, 'quantidadeItens' | 'quantidadeItensAtivos'> {
  itens: ClickTvPlaylistItem[];
}

export interface ClickTvPlaylistPayload {
  nome: string;
  descricao?: string | null;
  orientacao: ClickTvOrientacao;
  ativa: boolean;
}

export interface ClickTvTela {
  id: number;
  nome: string;
  descricaoLocal?: string | null;
  orientacao: ClickTvOrientacao;
  status: ClickTvStatusTela;
  ativa: boolean;
  versaoConfiguracao: number;
  playlistPadraoId?: number | null;
  playlistPadraoNome?: string | null;
  ultimaConexaoEm?: string | null;
  ultimaSincronizacaoEm?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ClickTvTelaPayload {
  nome: string;
  descricaoLocal?: string | null;
  orientacao: ClickTvOrientacao;
}

export const CLICKTV_ORIENTACOES: ClickTvOrientacao[] = [
  'HORIZONTAL',
  'VERTICAL',
  'QUADRADA',
  'INDEFINIDA',
];

export function clickTvHttpParams(
  values: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  return Object.entries(values).reduce<Record<string, string>>((params, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = String(value);
    }
    return params;
  }, {});
}
