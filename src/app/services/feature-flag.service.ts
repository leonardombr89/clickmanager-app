import { Injectable, Signal, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { ApiService } from './api.service';

type FeatureMap = Record<string, boolean>;

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {
  private readonly endpoint = 'api/empresa/modulos';
  private readonly featureState = signal<FeatureMap>({});
  private carregamento$?: Observable<FeatureMap>;

  readonly features: Signal<FeatureMap> = this.featureState.asReadonly();

  constructor(private readonly api: ApiService) {}

  carregar(force = false): Observable<FeatureMap> {
    if (Object.keys(this.featureState()).length && !force) {
      return of(this.featureState());
    }

    if (this.carregamento$ && !force) {
      return this.carregamento$;
    }

    this.carregamento$ = this.api.get<unknown>(this.endpoint).pipe(
      map((response) => this.toFeatureMap(response)),
      tap((features) => this.featureState.set(features)),
      catchError(() => {
        this.featureState.set({});
        return of({});
      }),
      finalize(() => {
        this.carregamento$ = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.carregamento$;
  }

  isEnabled(featureKey: string): boolean {
    const key = (featureKey || '').trim();
    if (!key) return false;
    return this.featureState()[key] === true;
  }

  setFeaturesForTests(features: FeatureMap): void {
    this.featureState.set({ ...features });
  }

  private toFeatureMap(response: unknown): FeatureMap {
    const source = Array.isArray(response)
      ? response
      : Array.isArray((response as any)?.modulos)
        ? (response as any).modulos
        : Array.isArray((response as any)?.items)
          ? (response as any).items
          : [];

    const features = source.reduce((acc: FeatureMap, item: any) => {
      const codigo = String(item?.codigo ?? item?.key ?? item?.featureKey ?? '').trim();
      if (!codigo) return acc;
      acc[codigo] = item?.ativo === true || item?.enabled === true || item?.habilitado === true;
      return acc;
    }, {});

    features['funcionarios'] = features['funcionarios'] === true || features['PESSOAS'] === true;
    features['folhaPagamento'] = features['folhaPagamento'] === true || features['FOLHA'] === true;

    return features;
  }
}
