import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { CalculadoraMaterialService } from 'src/app/pages/calculadora-materiais/shared/calculadora-material.service';
import {
  CalculadoraMaterialEmbalagem,
  CalculadoraMaterialPendencia,
  CalculadoraMaterialUnidadeComercial,
  CalculadoraMaterialUnidadeDimensao,
  ProdutoCalculadoraMaterialRequest,
  ProdutoCalculadoraMaterialResponse,
  StatusConfiguracaoCalculadoraMaterial,
  TipoCalculoMaterial,
} from 'src/app/pages/calculadora-materiais/shared/calculadora-material.models';

@Component({
  selector: 'app-produto-calculadora-materiais-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, SectionCardComponent, InputOptionsComponent],
  templateUrl: './produto-calculadora-materiais-tab.component.html',
  styleUrls: ['./produto-calculadora-materiais-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProdutoCalculadoraMateriaisTabComponent implements OnChanges {
  @Input({ required: true }) produtoId!: number;

  readonly tiposCalculo: Array<{ value: TipoCalculoMaterial; label: string }> = [
    { value: 'REVESTIMENTO_AREA', label: 'Revestimento por area' },
  ];

  readonly unidadesComerciais: Array<{ value: CalculadoraMaterialUnidadeComercial; label: string }> = [
    { value: 'UNIDADE', label: 'Unidade' },
    { value: 'METRO', label: 'Metro' },
    { value: 'METRO_QUADRADO', label: 'Metro quadrado' },
    { value: 'METRO_CUBICO', label: 'Metro cubico' },
    { value: 'CAIXA', label: 'Caixa' },
    { value: 'PACOTE', label: 'Pacote' },
    { value: 'SACO', label: 'Saco' },
    { value: 'LITRO', label: 'Litro' },
    { value: 'MILILITRO', label: 'Mililitro' },
    { value: 'QUILOGRAMA', label: 'Quilograma' },
    { value: 'GRAMA', label: 'Grama' },
    { value: 'PAR', label: 'Par' },
    { value: 'JOGO', label: 'Jogo' },
    { value: 'ROLO', label: 'Rolo' },
  ];

  readonly unidadesDimensao: Array<{ value: CalculadoraMaterialUnidadeDimensao; label: string }> = [
    { value: 'METRO', label: 'Metro' },
    { value: 'CENTIMETRO', label: 'Centimetro' },
    { value: 'MILIMETRO', label: 'Milimetro' },
  ];

  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly habilitando = signal(false);
  readonly config = signal<ProdutoCalculadoraMaterialResponse | null>(null);
  readonly pendencias = computed<CalculadoraMaterialPendencia[]>(() => this.config()?.pendencias ?? []);
  readonly podeHabilitar = computed(() => this.config()?.podeHabilitar === true || this.config()?.status === 'PRONTO_PARA_HABILITAR');

  readonly form = this.fb.group({
    tipoCalculoMaterial: ['REVESTIMENTO_AREA' as TipoCalculoMaterial, Validators.required],
    percentualPerdaPadrao: [null as number | null, [Validators.min(0)]],
    permiteAlterarPercentualPerda: [true],
    quantidadeMinimaVenda: [null as number | null, [Validators.min(0)]],
    multiploVenda: [null as number | null, [Validators.min(0)]],
    unidadeComercial: [null as CalculadoraMaterialUnidadeComercial | null],
    coberturaM2: [null as number | null, [Validators.min(0)]],
    pecasPorEmbalagem: [null as number | null, [Validators.min(0)]],
    larguraPeca: [null as number | null, [Validators.min(0)]],
    comprimentoPeca: [null as number | null, [Validators.min(0)]],
    unidadeDimensao: [null as CalculadoraMaterialUnidadeDimensao | null],
    ativo: [false],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: CalculadoraMaterialService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['produtoId'] && Number.isFinite(Number(this.produtoId))) {
      this.carregar();
    }
  }

  carregar(): void {
    this.carregando.set(true);
    this.service.buscarConfiguracao(this.produtoId).subscribe({
      next: (config) => {
        this.carregando.set(false);
        this.preencher(config);
      },
      error: () => {
        this.carregando.set(false);
        this.toastr.error('Erro ao carregar a Calculadora de Materiais.');
      },
    });
  }

  salvar(): void {
    if (this.form.invalid || this.salvando()) {
      this.form.markAllAsTouched();
      this.toastr.warning('Revise os campos da calculadora.');
      return;
    }

    this.salvando.set(true);
    this.service.salvarConfiguracao(this.produtoId, this.buildPayload()).subscribe({
      next: (config) => {
        this.preencher(config);
        this.toastr.success('Configuração da calculadora salva.');
        this.processarRetornoAposSalvar();
      },
      error: () => {
        this.salvando.set(false);
        this.toastr.error('Erro ao salvar a Calculadora de Materiais.');
      },
    });
  }

  habilitar(): void {
    if (this.habilitando()) return;
    this.habilitando.set(true);
    this.service.validarProduto(this.produtoId).subscribe({
      next: (validacao) => {
        if (!validacao.podeAdicionar && validacao.status !== 'PRONTO_PARA_HABILITAR' && validacao.status !== 'HABILITADO') {
          this.habilitando.set(false);
          this.config.update((atual) => atual ? { ...atual, status: validacao.status, pendencias: validacao.pendencias, podeHabilitar: false } : atual);
          this.toastr.warning('Produto ainda possui pendências para habilitar.');
          return;
        }

        this.service.habilitarProduto(this.produtoId).subscribe({
          next: (config) => {
            this.habilitando.set(false);
            this.preencher(config);
            this.toastr.success('Produto habilitado na Calculadora de Materiais.');
          },
          error: () => {
            this.habilitando.set(false);
            this.toastr.error('Erro ao habilitar produto.');
          },
        });
      },
      error: () => {
        this.habilitando.set(false);
        this.toastr.error('Erro ao validar produto.');
      },
    });
  }

  desabilitar(): void {
    this.habilitando.set(true);
    this.service.alterarHabilitacao(this.produtoId, false).subscribe({
      next: (config) => {
        this.habilitando.set(false);
        this.preencher(config);
        this.toastr.success('Produto desabilitado na Calculadora de Materiais.');
      },
      error: () => {
        this.habilitando.set(false);
        this.toastr.error('Erro ao desabilitar produto.');
      },
    });
  }

  statusLabel(status: StatusConfiguracaoCalculadoraMaterial | null | undefined): string {
    const labels: Record<StatusConfiguracaoCalculadoraMaterial, string> = {
      NAO_CONFIGURADO: 'Nao configurado',
      CONFIGURACAO_INCOMPLETA: 'Configuracao incompleta',
      PRONTO_PARA_HABILITAR: 'Pronto para habilitar',
      HABILITADO: 'Habilitado',
      PRODUTO_INATIVO: 'Produto inativo',
      PRECO_NAO_CONFIGURADO: 'Preco nao configurado',
    };
    return status ? labels[status] : 'Nao configurado';
  }

  get tipoCalculoMaterialControl(): FormControl {
    return this.form.get('tipoCalculoMaterial') as FormControl;
  }

  get percentualPerdaPadraoControl(): FormControl {
    return this.form.get('percentualPerdaPadrao') as FormControl;
  }

  get quantidadeMinimaVendaControl(): FormControl {
    return this.form.get('quantidadeMinimaVenda') as FormControl;
  }

  get multiploVendaControl(): FormControl {
    return this.form.get('multiploVenda') as FormControl;
  }

  get unidadeComercialControl(): FormControl {
    return this.form.get('unidadeComercial') as FormControl;
  }

  get coberturaM2Control(): FormControl {
    return this.form.get('coberturaM2') as FormControl;
  }

  get pecasPorEmbalagemControl(): FormControl {
    return this.form.get('pecasPorEmbalagem') as FormControl;
  }

  get larguraPecaControl(): FormControl {
    return this.form.get('larguraPeca') as FormControl;
  }

  get comprimentoPecaControl(): FormControl {
    return this.form.get('comprimentoPeca') as FormControl;
  }

  get unidadeDimensaoControl(): FormControl {
    return this.form.get('unidadeDimensao') as FormControl;
  }

  private preencher(config: ProdutoCalculadoraMaterialResponse): void {
    const embalagem = config.embalagem;
    this.config.set(config);
    this.form.patchValue({
      tipoCalculoMaterial: config.tipoCalculoMaterial ?? 'REVESTIMENTO_AREA',
      percentualPerdaPadrao: config.percentualPerdaPadrao,
      permiteAlterarPercentualPerda: config.permiteAlterarPercentualPerda ?? true,
      quantidadeMinimaVenda: config.quantidadeMinimaVenda,
      multiploVenda: config.multiploVenda,
      unidadeComercial: embalagem?.unidadeComercial ?? null,
      coberturaM2: embalagem?.coberturaM2 ?? null,
      pecasPorEmbalagem: embalagem?.pecasPorEmbalagem ?? null,
      larguraPeca: embalagem?.larguraPeca ?? null,
      comprimentoPeca: embalagem?.comprimentoPeca ?? null,
      unidadeDimensao: embalagem?.unidadeDimensao ?? null,
      ativo: config.ativo ?? false,
    }, { emitEvent: false });
  }

  private buildPayload(): ProdutoCalculadoraMaterialRequest {
    const raw = this.form.getRawValue();
    const embalagem: CalculadoraMaterialEmbalagem = {
      unidadeComercial: raw.unidadeComercial,
      pecasPorEmbalagem: this.toNumberOrNull(raw.pecasPorEmbalagem),
      coberturaM2: this.toNumberOrNull(raw.coberturaM2),
      larguraPeca: this.toNumberOrNull(raw.larguraPeca),
      comprimentoPeca: this.toNumberOrNull(raw.comprimentoPeca),
      unidadeDimensao: raw.unidadeDimensao,
    };

    return {
      tipoCalculoMaterial: raw.tipoCalculoMaterial,
      embalagem,
      percentualPerdaPadrao: this.toNumberOrNull(raw.percentualPerdaPadrao),
      permiteAlterarPercentualPerda: raw.permiteAlterarPercentualPerda ?? false,
      quantidadeMinimaVenda: this.toNumberOrNull(raw.quantidadeMinimaVenda),
      multiploVenda: this.toNumberOrNull(raw.multiploVenda),
      ativo: raw.ativo ?? false,
    };
  }

  private processarRetornoAposSalvar(): void {
    if (this.route.snapshot.queryParamMap.get('habilitarAoSalvar') !== 'true') {
      this.salvando.set(false);
      return;
    }

    this.service.validarProduto(this.produtoId).subscribe({
      next: (validacao) => {
        if (validacao.status !== 'PRONTO_PARA_HABILITAR' && validacao.status !== 'HABILITADO' && !validacao.podeAdicionar) {
          this.salvando.set(false);
          this.config.update((atual) => atual ? { ...atual, status: validacao.status, pendencias: validacao.pendencias, podeHabilitar: false } : atual);
          this.toastr.warning('Configuração salva, mas ainda existem pendências.');
          return;
        }

        this.service.habilitarProduto(this.produtoId).subscribe({
          next: (config) => {
            this.salvando.set(false);
            this.preencher(config);
            this.toastr.success('Produto configurado e habilitado.');
            const returnUrl = this.returnUrlInterno();
            if (returnUrl) this.router.navigateByUrl(returnUrl);
          },
          error: () => {
            this.salvando.set(false);
            this.toastr.error('Configuração salva, mas não foi possível habilitar.');
          },
        });
      },
      error: () => {
        this.salvando.set(false);
        this.toastr.error('Configuração salva, mas não foi possível validar.');
      },
    });
  }

  private returnUrlInterno(): string | null {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('://')) return null;
    return value;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
