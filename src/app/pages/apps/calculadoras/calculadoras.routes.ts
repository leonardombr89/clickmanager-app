import { Routes } from '@angular/router';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { DEPOSITO_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';

export const CalculadorasRoutes: Routes = [
  {
    path: 'pisos',
    loadComponent: () => import('./pisos/calculadora-pisos.component').then((m) => m.CalculadoraPisosComponent),
    canActivate: [permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      requiredPermission: ['CALCULADORA_PISOS_USAR'],
      title: 'Calculadora de Materiais',
      urls: [
        { title: 'Orçamentos', url: '/page/orcamentos' },
        { title: 'Calculadora de Materiais' },
      ],
    },
  },
];
