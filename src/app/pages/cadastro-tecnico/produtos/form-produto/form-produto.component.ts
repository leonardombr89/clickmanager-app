import { CommonModule } from '@angular/common';
import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild
} from '@angular/core';
import {
  ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, FormControl
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ToastrService } from 'ngx-toastr';

import { SharedComponentsModule } from 'src/app/components/shared-components.module';
import { ProdutoService } from '../../services/produto.service';

import { ProdutoRequest } from 'src/app/models/produto/produto-request.model';
import { VariacoesProdutoComponent } from './variacoes-produto/variacoes-produto.component';
import { VariacaoProduto } from './variacoes-produto/models/variacao.model';
import { PrecoRequest } from 'src/app/models/preco/preco.model';
import { VariacaoProdutoRequest } from 'src/app/models/produto/variacao-produto-request.model';
import { PoliticaRevenda } from 'src/app/models/politica-revenda.model';
import { PoliticaRevendaComponent } from './politica-revenda/politica-revenda.component';
import { ProdutoResponse } from 'src/app/models/produto/produto-response.model';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import {
  CALCULADORA_MATERIAIS_MODULO,
  CALCULADORA_MATERIAIS_PERMISSAO_CONFIGURAR,
} from 'src/app/pages/calculadora-materiais/shared/calculadora-material.models';
import { ProdutoCalculadoraMateriaisTabComponent } from './calculadora-materiais/produto-calculadora-materiais-tab.component';

@Component({
  selector: 'app-form-produto',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TablerIconsModule,
    SharedComponentsModule,
    VariacoesProdutoComponent,
    PoliticaRevendaComponent,
    PageCardComponent,
    SectionCardComponent,
    InputTextareaComponent,
    MobileTotalBarComponent,
    ProdutoCalculadoraMateriaisTabComponent
  ],
  templateUrl: './form-produto.component.html',
  styleUrls: ['./form-produto.component.scss'],
})
export class FormProdutoComponent implements OnInit, OnDestroy {
  @ViewChild('wizardTop') wizardTop?: ElementRef<HTMLElement>;
  readonly baseWizardSteps = [
    { key: 'produto', label: 'Produto' },
    { key: 'estrutura', label: 'Estrutura' },
    { key: 'preco', label: 'Preço' },
    { key: 'revisao', label: 'Revisão' },
  ] as const;
  readonly calculadoraMateriaisTabKey = 'calculadora-materiais';
  wizardSteps: Array<{ key: string; label: string }> = [...this.baseWizardSteps];

  form!: FormGroup;
  isEditMode = false;
  produtoId!: number;
  politicaDoProduto: PoliticaRevenda | null = null;
  currentStep = 1;
  exibirAbaCalculadoraMateriais = false;

  /** estado local das variações (o filho emite alterações) */
  variacoes: VariacaoProduto[] = [];

  /** seed para o filho preencher a tabela quando for edição */
  variacoesIniciais: VariacaoProduto[] = [];

  /** loading simples para feedback */
  loading = false;

  private readonly destroy$ = new Subject<void>();
  private queryParamTab: string | null = null;
  private moduloCalculadoraMateriaisHabilitado = false;
  private permissaoCalculadoraMateriais = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly produtoService: ProdutoService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
    private readonly featureFlagService: FeatureFlagService
  ) { }

  // ================= lifecycle =================

  ngOnInit(): void {
    this.buildForm();
    this.carregarDisponibilidadeCalculadoraMateriais();
    this.detectEditModeAndLoad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ================= template bindings =================

  onVariacoesChange(lista: VariacaoProduto[]) {
    // Garantir sempre estrutura de objeto; não aceitamos strings
    this.variacoes = (Array.isArray(lista) ? lista : [])
      .filter(v => typeof v === 'object' && v !== null) as VariacaoProduto[];
    this.cdr.markForCheck();
  }

  // ================= init/load =================

  private buildForm(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(120)]],
      descricao: ['', [Validators.required, Validators.maxLength(1000)]],
      // se precisar no futuro:
      // categoriaId: [null],
      // grupoId: [null],
    });
  }

  private detectEditModeAndLoad(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const idParam = params.get('id');
        this.isEditMode = !!idParam;
        if (!this.isEditMode) return;

        this.produtoId = Number(idParam);
        if (!Number.isFinite(this.produtoId)) return;

        this.queryParamTab = this.route.snapshot.queryParamMap.get('tab');
        this.atualizarWizardSteps();
        this.fetchProduto(this.produtoId);
      });
  }

  private carregarDisponibilidadeCalculadoraMateriais(): void {
    this.permissaoCalculadoraMateriais = this.authService.temPermissao(CALCULADORA_MATERIAIS_PERMISSAO_CONFIGURAR);

    this.featureFlagService.carregar()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.moduloCalculadoraMateriaisHabilitado = this.featureFlagService.isEnabled(CALCULADORA_MATERIAIS_MODULO);
        this.atualizarWizardSteps();
        this.cdr.markForCheck();
      });
  }

  private atualizarWizardSteps(): void {
    const currentKey = this.currentStepKey;
    this.exibirAbaCalculadoraMateriais = this.isEditMode
      && this.moduloCalculadoraMateriaisHabilitado
      && this.permissaoCalculadoraMateriais;

    this.wizardSteps = this.exibirAbaCalculadoraMateriais
      ? [...this.baseWizardSteps, { key: this.calculadoraMateriaisTabKey, label: 'Calculadora de Materiais' }]
      : [...this.baseWizardSteps];

    const queryKey = this.queryParamTab === this.calculadoraMateriaisTabKey ? this.queryParamTab : null;
    const preferredKey = queryKey || currentKey;
    const preferredIndex = this.wizardSteps.findIndex((step) => step.key === preferredKey);

    if (preferredIndex >= 0) {
      this.currentStep = preferredIndex + 1;
      return;
    }

    this.currentStep = 1;
  }

  private fetchProduto(id: number): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.produtoService.buscarPorId(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (produto: ProdutoResponse) => {
          this.patchProduto(produto);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Erro ao carregar produto.');
          this.router.navigate(['/page/cadastro-tecnico/produtos']);
          this.cdr.markForCheck();
        }
      });
  }

  private dedupeById<T extends { id: number }>(arr: T[] = []): T[] {
    const seen = new Set<number>();
    return (arr || []).filter(x => !seen.has(x.id) && seen.add(x.id));
  }


  private patchProduto(produto: ProdutoResponse): void {
    this.form.patchValue({
      nome: produto?.nome ?? '',
      descricao: produto?.descricao ?? ''
    });

    this.politicaDoProduto = this.mapPoliticaRevenda(produto.politicaRevenda);

    this.variacoesIniciais = (produto?.variacoes ?? []).map(v => ({
      id: v.id,
      materialId: v.materialId,
      formatoId: v.formatoId,
      cor: v.corId ? { id: v.corId, nome: v.corNome ?? undefined } : null,

      // ✅ objetos completos vindos do back (com dedupe se necessário)
      acabamentos: this.dedupeById(
        (v.acabamentos ?? []).map(a => ({
          id: a.id,
          nome: a.nome,
          descricao: a.descricao,
          ativo: a.ativo,
        }))
      ),
      servicos: this.dedupeById(
        (v.servicos ?? []).map(s => ({
          id: s.id,
          nome: s.nome,
          descricao: s.descricao,
          ativo: s.ativo,
        }))
      ),

      // preço da variação (já vem pronto para o PrecoSelector)
      preco: v.preco ?? null,

      politicaRevenda: this.politicaDoProduto ?? null,
    }));

    this.variacoes = [...this.variacoesIniciais];

    this.cdr.markForCheck();
  }

  // ================= submit =================
  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      this.toastr.error('Preencha os campos obrigatórios.');
      return;
    }

    if (!Array.isArray(this.variacoes) || !this.variacoes.length) {
      this.toastr.error('Adicione pelo menos uma variação antes de salvar.');
      return;
    }

    // Bloqueia casos em que o filho emite strings ou linhas sem ids/preço
    const invalidRow = this.variacoes.find(v => this.isInvalidVariacao(v as any));
    if (invalidRow) {
      this.toastr.error('Há variações com dados inválidos. Verifique material, formato e preço.');
      return;
    }

    const payload = this.toProdutoRequest(this.form.getRawValue());

    this.loading = true;
    this.cdr.markForCheck();

    const req$ = this.isEditMode
      ? this.produtoService.atualizar(this.produtoId, payload)
      : this.produtoService.salvar(payload);

    req$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.toastr.success(this.isEditMode ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
          this.router.navigate(['/page/cadastro-tecnico/produtos']);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.toastr.error(this.isEditMode ? 'Erro ao atualizar produto.' : 'Erro ao criar produto.');
          this.cdr.markForCheck();
        }
      });
  }

  // ================= utils =================

  private isInvalidVariacao(v: any): boolean {
    if (typeof v !== 'object' || v == null) return true;
    const toId = (x: any) => x == null ? null : (typeof x === 'object' ? Number(x.id) : Number(x));
    const materialId = toId(v.materialId);
    const precoTipo = v?.preco?.tipo;
    return !materialId || !precoTipo;
  }

  private num(v: any): number {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error('Valor numérico inválido.');
    return n;
  }

  private numOrNull(v: any): number | null {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  onPoliticaChange(val: PoliticaRevenda | null) {
    this.politicaDoProduto = val;
    this.cdr.markForCheck();
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) return;
    if (step > this.maxAccessibleStep) return;
    this.currentStep = step;
    this.cdr.markForCheck();
    this.scrollToWizardTop();
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      this.nomeControl.markAsTouched();
      this.descricaoControl.markAsTouched();
      if (!this.stepProdutoCompleta) {
        this.toastr.error('Preencha nome e descrição para continuar.');
        return;
      }
    }

    if (this.currentStep === 2 && !this.stepEstruturaCompleta) {
      this.toastr.error('Gere ao menos uma variação antes de continuar.');
      return;
    }

    if (this.currentStep === 3 && !this.stepPrecoCompleta) {
      this.toastr.error('Defina o preço das variações antes de revisar o cadastro.');
      return;
    }

    this.currentStep = Math.min(this.currentStep + 1, this.totalSteps);
    this.cdr.markForCheck();
    this.scrollToWizardTop();
  }

  previousStep(): void {
    this.currentStep = Math.max(this.currentStep - 1, 1);
    this.cdr.markForCheck();
    this.scrollToWizardTop();
  }

  get showMobileWizardFooter(): boolean {
    if (this.currentStep === this.calculadoraMateriaisStep) return false;
    return this.currentStep !== 2;
  }

  get mobileWizardFooterLabel(): string {
    return `Etapa ${this.currentStep} de ${this.totalSteps}`;
  }

  get mobileWizardFooterValueText(): string {
    switch (this.currentStepKey) {
      case 'produto':
        return 'Produto';
      case 'preco':
        return 'Preço';
      case 'revisao':
        return 'Revisão';
      case 'calculadora-materiais':
        return 'Calculadora';
      default:
        return '';
    }
  }

  get mobileWizardFooterSecondaryActionText(): string {
    return this.currentStep > 1 ? 'Voltar' : '';
  }

  get mobileWizardFooterActionText(): string {
    if (this.currentStep === 4) {
      return this.loading ? 'Salvando...' : (this.isEditMode ? 'Atualizar produto' : 'Salvar produto');
    }

    if (this.currentStep === 3) {
      return 'Revisar produto →';
    }

    return 'Próximo';
  }

  get mobileWizardFooterActionDisabled(): boolean {
    if (this.loading) {
      return true;
    }

    switch (this.currentStep) {
      case 1:
        return !this.stepProdutoCompleta;
      case 3:
        return !this.stepPrecoCompleta;
      case 4:
        return !this.prontoParaSalvar;
      default:
        return false;
    }
  }

  onMobileWizardPrimaryAction(): void {
    if (this.currentStep === 4) {
      this.onSubmit();
      return;
    }

    this.nextStep();
  }

  onMobileWizardSecondaryAction(): void {
    if (this.currentStep <= 1) {
      return;
    }

    this.previousStep();
  }

  // ================= mapping helpers =================

  private toProdutoRequest(formValue: any): ProdutoRequest {
    return {
      nome: String(formValue?.nome ?? '').trim(),
      descricao: String(formValue?.descricao ?? '').trim(),
      variacoes: this.toVariacoesRequest(this.variacoes),
      politicaRevenda: this.buildPoliticaRevendaPayload() ?? undefined, // envia só se existir
    };
  }

  private scrollToWizardTop(): void {
    setTimeout(() => {
      this.wizardTop?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 30);
  }

  private buildPoliticaRevendaPayload(): ProdutoRequest['politicaRevenda'] | null {
    const src = this.politicaDoProduto ?? this.extractPoliticaFromVariacoes(this.variacoes);
    if (!src) return null;

    const percentual = !!src.percentual;
    const percentualDesconto = percentual ? this.numOrNull(src.percentualDesconto) : undefined;
    const precoFixo = !percentual ? this.numOrNull(src.precoFixo) : undefined;

    // (opcional) validação simples: não permitir ambos/nenhum
    if (percentual && (percentualDesconto == null)) {
      this.toastr.error('Defina o percentual de desconto da política.');
      throw new Error('PoliticaRevenda inválida: percentual sem valor.');
    }
    if (!percentual && (precoFixo == null)) {
      this.toastr.error('Defina o preço fixo da política.');
      throw new Error('PoliticaRevenda inválida: preço fixo ausente.');
    }

    return { percentual, percentualDesconto, precoFixo };
  }

  private extractPoliticaFromVariacoes(lista: VariacaoProduto[]): PoliticaRevenda | null {
    const p = (lista ?? []).find(v => !!v.politicaRevenda)?.politicaRevenda;
    return p ? this.normalizePolitica(p) : null;
  }

  private normalizePolitica(src: any): PoliticaRevenda {
    if (!src) return null as any;

    const percentual = !!src.percentual;

    return {
      id: src.id ?? undefined,
      percentual,
      // quando for percentual, usa percentualDesconto; quando for preço fixo, usa precoFixo
      percentualDesconto: percentual
        ? this.numOrNull(src.percentualDesconto)
        : undefined,
      precoFixo: !percentual
        ? this.numOrNull(src.precoFixo)
        : undefined,
    };
  }

  private extractId(val: any): number | null {
    if (val == null) return null;
    if (typeof val === 'number') return Number(val);
    if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val);
    if (typeof val === 'object') {
      if ('id' in val && val.id != null) return Number(val.id);
      if ('value' in val && val.value != null) return Number(val.value);
    }
    return null;
  }

  private toVariacoesRequest(lista: VariacaoProduto[]): VariacaoProdutoRequest[] {
    return (lista ?? []).map((v: any) => {
      const materialId = this.extractId(v.materialId);
      const formatoId = this.extractId(v.formatoId);
      // aceita v.cor (objeto/numero) ou v.corId (fallback)
      const corId = this.extractId(v.cor ?? v.corId);

      if (!materialId || !v?.preco?.tipo) {
        throw new Error('Variação inválida (material ou preço ausente).');
      }

      return {
        ...(v?.id ? { id: Number(v.id) } : {}),
        ...(this.isEditMode ? {} : {}), // não enviar produtoId (mantém o mesmo shape do criar)
        materialId: Number(materialId),
        ...(formatoId != null ? { formatoId: Number(formatoId) } : { formatoId: null }),
        corId: corId != null ? Number(corId) : null,
        acabamentoIds: Array.isArray(v.acabamentos) ? v.acabamentos.map((x: any) => Number(this.extractId(x))) : [],
        servicoIds: Array.isArray(v.servicos) ? v.servicos.map((x: any) => Number(this.extractId(x))) : [],
        preco: this.toPrecoRequest(v.preco),
      } as VariacaoProdutoRequest;
    });
  }

  private toPrecoRequest(preco: any): PrecoRequest {
    if (!preco?.tipo) throw new Error('Preço inválido na variação.');
    const p = preco ?? {};

    switch (preco.tipo) {
      case 'FIXO':
        return { tipo: 'FIXO', valor: this.num(p.valor) };

      case 'QUANTIDADE':
        return {
          tipo: 'QUANTIDADE',
          faixas: (p.faixas ?? []).map((f: any) => ({
            quantidade: this.num(f.quantidade),
            valor: this.num(f.valor),
          })),
        };

      case 'DEMANDA':
        return {
          tipo: 'DEMANDA',
          faixas: (p.faixas ?? []).map((f: any) => ({
            de: this.num(f.de),
            ate: this.num(f.ate),
            valorUnitario: this.num(f.valorUnitario),
          })),
        };

      case 'METRO':
        return {
          tipo: 'METRO',
          precoMetro: this.num(p.precoMetro),
          modoCobranca: p.modoCobranca ?? 'QUADRADO',
          ...(p.precoMinimo != null ? { precoMinimo: this.num(p.precoMinimo) } : {}),
          ...(p.alturaMaxima != null ? { alturaMaxima: this.num(p.alturaMaxima) } : {}),
          ...(p.larguraMaxima != null ? { larguraMaxima: this.num(p.larguraMaxima) } : {}),
          ...(p.largurasLinearesPermitidas
            ? { largurasLinearesPermitidas: String(p.largurasLinearesPermitidas) }
            : {}),
        } as PrecoRequest;

      default:
        throw new Error(`Tipo de preço desconhecido: ${preco?.tipo}`);
    }
  }

  private mapPoliticaRevenda(src: PoliticaRevenda | null | undefined): PoliticaRevenda | null {
    if (!src) return null;
    return {
      id: src.id,
      percentual: !!src.percentual,
      percentualDesconto: src.percentual ? (src.percentualDesconto ?? undefined) : undefined,
      precoFixo: !src.percentual ? (src.precoFixo ?? undefined) : undefined,
    };
  }

  // ================= getters de conveniência =================

  get nomeControl(): FormControl {
    return this.form.get('nome') as FormControl;
  }
  get descricaoControl(): FormControl {
    return this.form.get('descricao') as FormControl;
  }

  get variacoesCount(): number {
    return this.variacoes.length;
  }

  get resumoNome(): string {
    const nome = String(this.nomeControl.value ?? '').trim();
    return nome || 'Pendente';
  }

  get prontoParaSalvar(): boolean {
    return this.stepProdutoCompleta && this.stepEstruturaCompleta && this.stepPrecoCompleta;
  }

  get statusRevisaoTitulo(): string {
    return this.prontoParaSalvar ? 'Pronto para salvar' : 'Ainda falta revisar';
  }

  get statusRevisaoDescricao(): string {
    if (this.prontoParaSalvar) {
      return 'O produto já tem base, estrutura e preço. Está pronto para concluir o cadastro.';
    }

    return 'Revise os dados principais, gere as variações e aplique o preço antes de salvar.';
  }

  get resumoPolitica(): string {
    if (!this.politicaDoProduto) {
      return 'Opcional';
    }

    return this.politicaDoProduto.percentual ? 'Percentual configurado' : 'Preço fixo configurado';
  }

  get pendenciasSalvamento(): string[] {
    const pendencias: string[] = [];

    if (!String(this.nomeControl.value ?? '').trim()) {
      pendencias.push('Informe o nome do produto.');
    }

    if (!String(this.descricaoControl.value ?? '').trim()) {
      pendencias.push('Descreva o produto para facilitar a identificação.');
    }

    if (!this.variacoesCount) {
      pendencias.push('Gere ao menos uma variação antes de salvar.');
    }

    if (this.variacoesSemPrecoCount > 0) {
      pendencias.push('Aplique uma regra de preço em todas as variações.');
    }

    return pendencias;
  }

  get variacoesRenderizadas(): VariacaoProduto[] {
    return this.variacoes.length ? this.variacoes : this.variacoesIniciais;
  }

  get stepProdutoCompleta(): boolean {
    return this.form.valid;
  }

  get stepEstruturaCompleta(): boolean {
    return this.variacoesCount > 0;
  }

  get stepPrecoCompleta(): boolean {
    return this.variacoesCount > 0 && this.variacoesSemPrecoCount === 0;
  }

  get variacoesSemPrecoCount(): number {
    return this.variacoes.filter(v => !v?.preco?.tipo).length;
  }

  get resumoPreco(): string {
    if (!this.variacoesCount) {
      return 'Pendente';
    }

    const tipos = Array.from(new Set(this.variacoes.map(v => v?.preco?.tipo).filter(Boolean)));
    if (!tipos.length) {
      return 'Sem preço definido';
    }

    if (tipos.length > 1) {
      return 'Múltiplas regras';
    }

    return this.traduzirTipoPreco(tipos[0] as string);
  }

  get statusValidacao(): string {
    return this.prontoParaSalvar ? 'Pronto para salvar' : 'Em revisão';
  }

  get progressPercent(): number {
    return (this.completedStepsCount / this.totalSteps) * 100;
  }

  get completedStepsCount(): number {
    return [this.stepProdutoCompleta, this.stepEstruturaCompleta, this.stepPrecoCompleta, this.prontoParaSalvar]
      .filter(Boolean).length;
  }

  get maxAccessibleStep(): number {
    if (this.isEditMode) return this.totalSteps;
    if (this.currentStep === this.calculadoraMateriaisStep) return this.calculadoraMateriaisStep;
    if (!this.stepProdutoCompleta) return 1;
    if (!this.stepEstruturaCompleta) return 2;
    if (!this.stepPrecoCompleta) return 3;
    return this.exibirAbaCalculadoraMateriais ? this.calculadoraMateriaisStep : this.revisaoStep;
  }

  isStepComplete(step: number): boolean {
    if (step === this.calculadoraMateriaisStep) return false;
    return [this.stepProdutoCompleta, this.stepEstruturaCompleta, this.stepPrecoCompleta, this.prontoParaSalvar][step - 1] ?? false;
  }

  get totalSteps(): number {
    return this.wizardSteps.length;
  }

  get currentStepKey(): string {
    return this.wizardSteps[this.currentStep - 1]?.key ?? 'produto';
  }

  get calculadoraMateriaisStep(): number {
    return this.stepIndexByKey(this.calculadoraMateriaisTabKey);
  }

  get revisaoStep(): number {
    return this.stepIndexByKey('revisao');
  }

  private stepIndexByKey(key: string): number {
    const index = this.wizardSteps.findIndex((step) => step.key === key);
    return index >= 0 ? index + 1 : 0;
  }

  private traduzirTipoPreco(tipo: string): string {
    switch (tipo) {
      case 'FIXO': return 'Preço fixo';
      case 'QUANTIDADE': return 'Preço por quantidade';
      case 'DEMANDA': return 'Preço por demanda';
      case 'METRO': return 'Preço por metro';
      case 'HORA': return 'Preço por hora';
      default: return tipo;
    }
  }
}
