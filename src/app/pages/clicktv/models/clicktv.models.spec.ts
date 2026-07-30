import { clickTvHttpParams } from './clicktv.models';

describe('ClickTV models', () => {
  it('mantém false e zero, removendo apenas filtros vazios', () => {
    expect(clickTvHttpParams({
      nome: '',
      ativa: false,
      page: 0,
      status: undefined,
      tipo: null,
    })).toEqual({ ativa: 'false', page: '0' });
  });
});
