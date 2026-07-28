import { Orcamento } from 'src/app/models/orcamento/orcamento.model';
import {
  montarMensagemWhatsAppOrcamento,
  montarUrlWhatsAppOrcamento,
} from './orcamento-whatsapp.util';

describe('orcamento-whatsapp.util', () => {
  const orcamento: Orcamento = {
    id: 10,
    protocolo: 'SL-20260724-000010',
    nomeContato: 'Maria Silva',
    total: 239.4,
    observacaoGeral: 'Entrega a combinar.',
    itens: [
      {
        id: 1,
        produtoNome: 'Piso acetinado',
        quantidade: 6,
        unidade: 'CAIXA',
        valorUnitario: 39.9,
        subtotal: 239.4,
      },
    ],
  };

  it('monta uma mensagem com cliente, protocolo, itens e total', () => {
    const mensagem = montarMensagemWhatsAppOrcamento(orcamento);

    expect(mensagem).toContain('Olá, Maria Silva! Tudo bem?');
    expect(mensagem).toContain('orçamento *SL-20260724-000010*');
    expect(mensagem).toContain('1. *Piso acetinado*');
    expect(mensagem).toContain('6 caixas x R$ 39,90');
    expect(mensagem).toContain('Subtotal: *R$ 239,40*');
    expect(mensagem).toContain('*Total estimado: R$ 239,40*');
    expect(mensagem).toContain('Entrega a combinar.');
  });

  it('codifica a mensagem no parâmetro text do WhatsApp', () => {
    const url = montarUrlWhatsAppOrcamento('5511999999999', orcamento);
    const parametros = new URL(url).searchParams;

    expect(url.startsWith('https://wa.me/5511999999999?text=')).toBeTrue();
    expect(parametros.get('text')).toBe(montarMensagemWhatsAppOrcamento(orcamento));
  });

  it('trata itens e valores sob consulta', () => {
    const mensagem = montarMensagemWhatsAppOrcamento({
      id: 11,
      itens: [{ id: 2, descricao: 'Serviço especial', quantidade: 1, sobConsulta: true }],
    });

    expect(mensagem).toContain('1 unidade');
    expect(mensagem).toContain('Subtotal: *Sob consulta*');
    expect(mensagem).toContain('*Total estimado: Sob consulta*');
  });
});
