import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { TipoEmpresa } from '../models/empresa/tipo-empresa.enum';

describe('AuthService permissions', () => {
  function criarService(
    proprietario: boolean,
    permissoes: string[] = [],
    tipoEmpresa = TipoEmpresa.GRAFICA
  ): AuthService {
    const permissionsService = {
      flushPermissions: jasmine.createSpy('flushPermissions'),
      loadPermissions: jasmine.createSpy('loadPermissions'),
      getPermissions: () => Object.fromEntries(permissoes.map((chave) => [chave, {}])),
    };
    const usuarioService = {
      buscarAtual: () => of({
        id: 1,
        proprietario,
        empresa: { tipoEmpresa },
        perfil: { permissoes: permissoes.map((chave) => ({ chave })) },
      }),
    };
    const tokenStorage = {
      getToken: () => null,
      getAccessToken: () => null,
      getRefreshToken: () => null,
    };
    const service = new AuthService(
      permissionsService as any,
      usuarioService as any,
      {} as any,
      tokenStorage as any,
      {} as any,
      { error: jasmine.createSpy('error') } as any
    );
    service.carregarUsuarioCompleto().subscribe();
    return service;
  }

  it('libera qualquer permissão para o proprietário da empresa', () => {
    const service = criarService(true);
    expect(service.temPermissao('CLICKTV_VER')).toBeTrue();
    expect(service.temPermissao('CLICKTV_TELAS_GERENCIAR')).toBeTrue();
  });

  it('mantém usuários comuns limitados às permissões do perfil', () => {
    const service = criarService(false, ['CLICKTV_VER']);
    expect(service.temPermissao('CLICKTV_VER')).toBeTrue();
    expect(service.temPermissao('CLICKTV_TELAS_GERENCIAR')).toBeFalse();
  });

  it('direciona o proprietário de gráfica para o dashboard da gráfica', () => {
    const service = criarService(true, [], TipoEmpresa.GRAFICA);
    expect(service.getDefaultRouteForUsuario()).toBe('/dashboards/dashboard1');
  });

  it('direciona o proprietário de depósito para o dashboard do depósito', () => {
    const service = criarService(true, [], TipoEmpresa.DEPOSITO);
    expect(service.getDefaultRouteForUsuario()).toBe('/page/deposito');
  });

  it('não direciona uma gráfica para rotas de depósito por permissão inconsistente', () => {
    const service = criarService(false, ['DEPOSITO_DASHBOARD_VER'], TipoEmpresa.GRAFICA);
    expect(service.getDefaultRouteForUsuario()).toBe('/dashboards/dashboard1');
  });
});
