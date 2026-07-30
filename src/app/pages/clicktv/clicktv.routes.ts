import { Routes } from '@angular/router';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { SHARED_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';

export const CLICKTV_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'midias' },
  {
    path: 'midias',
    loadComponent: () => import('./components/midias/clicktv-midias.component').then((m) => m.ClickTvMidiasComponent),
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['CLICKTV_VER', 'CLICKTV_MIDIAS_GERENCIAR'],
      title: 'ClickTV · Mídias',
      urls: [{ title: 'ClickTV' }, { title: 'Mídias' }],
    },
  },
  {
    path: 'playlists',
    loadComponent: () => import('./components/playlists/clicktv-playlists.component').then((m) => m.ClickTvPlaylistsComponent),
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['CLICKTV_VER', 'CLICKTV_PLAYLISTS_GERENCIAR'],
      title: 'ClickTV · Playlists',
      urls: [{ title: 'ClickTV' }, { title: 'Playlists' }],
    },
  },
  {
    path: 'playlists/:id',
    loadComponent: () => import('./components/playlist-editor/clicktv-playlist-editor.component').then((m) => m.ClickTvPlaylistEditorComponent),
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['CLICKTV_VER', 'CLICKTV_PLAYLISTS_GERENCIAR'],
      title: 'ClickTV · Editor de playlist',
      urls: [{ title: 'ClickTV' }, { title: 'Playlists', url: '/page/clicktv/playlists' }, { title: 'Editor' }],
    },
  },
  {
    path: 'telas',
    loadComponent: () => import('./components/telas/clicktv-telas.component').then((m) => m.ClickTvTelasComponent),
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['CLICKTV_VER', 'CLICKTV_TELAS_GERENCIAR'],
      title: 'ClickTV · Telas',
      urls: [{ title: 'ClickTV' }, { title: 'Telas' }],
    },
  },
];
