import { Orcamento, OrcamentoItem } from 'src/app/models/orcamento/orcamento.model';

const moedaFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const quantidadeFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const unidades: Record<string, [string, string]> = {
  UNIDADE: ['unidade', 'unidades'],
  METRO: ['metro', 'metros'],
  METRO_QUADRADO: ['m²', 'm²'],
  METRO_CUBICO: ['m³', 'm³'],
  CAIXA: ['caixa', 'caixas'],
  PACOTE: ['pacote', 'pacotes'],
  SACO: ['saco', 'sacos'],
  LITRO: ['litro', 'litros'],
  MILILITRO: ['ml', 'ml'],
  QUILOGRAMA: ['kg', 'kg'],
  GRAMA: ['g', 'g'],
  PAR: ['par', 'pares'],
  JOGO: ['jogo', 'jogos'],
  ROLO: ['rolo', 'rolos'],
};

export function montarMensagemWhatsAppOrcamento(orcamento: Orcamento): string {
  const cliente = textoEmLinha(
    orcamento.nomeContato || orcamento.nomeCliente || orcamento.nome
  );
  const protocolo = textoEmLinha(orcamento.protocolo) || `#${orcamento.id}`;
  const itens = [...(orcamento.itens || [])].sort(
    (a, b) => (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER)
  );
  const linhas = [
    cliente ? `Olá, ${cliente}! Tudo bem?` : 'Olá! Tudo bem?',
    '',
    `Segue o orçamento *${protocolo}*:`,
    '',
    '*Itens*',
  ];

  if (!itens.length) {
    linhas.push('Nenhum item informado.');
  } else {
    itens.forEach((item, index) => {
      linhas.push(...linhasItem(item, index));
    });
  }

  const total = orcamento.total ?? orcamento.totalEstimado;
  linhas.push('', `*Total estimado: ${total == null ? 'Sob consulta' : formatarMoeda(total)}*`);

  const observacao = textoEmLinha(orcamento.observacaoGeral);
  if (observacao) {
    linhas.push('', '*Observações*', observacao);
  }

  linhas.push('', 'Fico à disposição para esclarecer qualquer dúvida.');
  return linhas.join('\n');
}

export function montarUrlWhatsAppOrcamento(telefone: string, orcamento: Orcamento): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(montarMensagemWhatsAppOrcamento(orcamento))}`;
}

function linhasItem(item: OrcamentoItem, index: number): string[] {
  const descricao = textoEmLinha(item.descricao || item.produtoNome) || 'Item não informado';
  const quantidade = item.quantidade ?? 0;
  const valorUnitario = item.valorUnitario ?? item.precoPromocional ?? item.precoUnitario;
  const subtotal = item.subtotal ?? item.subtotalEstimado;
  const quantidadeComUnidade = `${quantidadeFormatter.format(quantidade)} ${unidadeLabel(
    item.unidade || item.unidadeVenda,
    quantidade
  )}`;
  const detalheQuantidade = valorUnitario == null
    ? quantidadeComUnidade
    : `${quantidadeComUnidade} x ${formatarMoeda(valorUnitario)}`;
  const observacao = textoEmLinha(item.observacao);
  const linhas = [
    `${index + 1}. *${descricao}*`,
    `   ${detalheQuantidade}`,
    `   Subtotal: *${item.sobConsulta || subtotal == null ? 'Sob consulta' : formatarMoeda(subtotal)}*`,
  ];

  if (observacao) {
    linhas.push(`   Obs.: ${observacao}`);
  }

  return linhas;
}

function unidadeLabel(valor: string | null | undefined, quantidade: number): string {
  if (!valor) {
    return quantidade === 1 ? 'unidade' : 'unidades';
  }

  const labels = unidades[valor];
  if (labels) {
    return quantidade === 1 ? labels[0] : labels[1];
  }

  return valor.toLowerCase();
}

function textoEmLinha(valor: string | null | undefined): string {
  return (valor || '').replace(/\s+/g, ' ').trim();
}

function formatarMoeda(valor: number): string {
  return moedaFormatter.format(valor).replace(/\u00a0/g, ' ');
}
