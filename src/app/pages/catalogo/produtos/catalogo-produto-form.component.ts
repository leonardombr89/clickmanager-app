import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DepositoImagemGaleriaComponent } from 'src/app/pages/deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { RichTextEditorComponent } from 'src/app/components/rich-text-editor/rich-text-editor.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import {
  CatalogoCaracteristica,
  CatalogoCategoriaOption,
  CatalogoMarcaOption,
  CatalogoProduto,
  CatalogoProdutoImagemRequest,
  CatalogoProdutoRequest,
} from '../shared/models/catalogo.models';
import { CatalogoCategoriaService, CatalogoMarcaService, CatalogoProdutoService } from '../shared/services/catalogo.service';
import { catalogoErrorMessage, catalogoSlugify, CATALOGO_UNIDADES_VENDA } from '../shared/utils/catalogo-utils';
import { CatalogoProdutoCaracteristicasComponent } from '../shared/components/catalogo-produto-caracteristicas.component';
import { CanDeactivateWithPendingChanges } from '../shared/guards/pending-changes.guard';
import { InputMoedaComponent } from 'src/app/components/inputs/input-moeda/input-moeda.component';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import {
  CALCULADORA_MATERIAIS_MODULO,
  CALCULADORA_MATERIAIS_PERMISSAO_CONFIGURAR,
} from 'src/app/pages/calculadora-materiais/shared/calculadora-material.models';
import { ProdutoCalculadoraMateriaisTabComponent } from 'src/app/pages/cadastro-tecnico/produtos/form-produto/calculadora-materiais/produto-calculadora-materiais-tab.component';

@Component({
  selector: 'app-catalogo-produto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, PageCardComponent, SectionCardComponent, RichTextEditorComponent, DepositoImagemGaleriaComponent, CatalogoProdutoCaracteristicasComponent, InputMoedaComponent, InputNumericoComponent, InputTextareaComponent, InputTextoRestritoComponent, ProdutoCalculadoraMateriaisTabComponent],
  template: `
    <app-page-card [titulo]="isEdit ? 'Editar produto' : 'Novo produto'" subtitulo="Produto do novo catalogo administrativo">
      <form [formGroup]="form" (ngSubmit)="salvar()">
        <mat-tab-group [selectedIndex]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
          <mat-tab label="Dados gerais">
            <app-section-card titulo="Identificacao" subtitulo="Codigo, nome, categoria, marca e exibicao">
              <div class="grid">
                <app-input-texto-restrito [control]="codigoControl" label="Codigo" [maxlength]="50"></app-input-texto-restrito>
                <app-input-texto-restrito [control]="nomeControl" label="Nome" [maxlength]="160"></app-input-texto-restrito>
                <app-input-texto-restrito [control]="slugControl" label="Slug" [maxlength]="180" (input)="slugManual = true"></app-input-texto-restrito>
                <mat-form-field appearance="outline"><mat-label>Categoria</mat-label><mat-select formControlName="categoriaId" required (selectionChange)="onCategoriaChange($event.value)"><mat-option *ngFor="let item of categorias" [value]="item.id">{{ item.nome }}</mat-option></mat-select></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Marca</mat-label><mat-select formControlName="marcaId"><mat-option [value]="null">Sem marca</mat-option><mat-option *ngFor="let item of marcas" [value]="item.id">{{ item.nome }}</mat-option></mat-select></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Unidade de venda</mat-label><mat-select formControlName="unidadeVenda" required><mat-option *ngFor="let item of unidades" [value]="item.value">{{ item.label }}</mat-option></mat-select></mat-form-field>
                <app-input-numerico [control]="ordemExibicaoControl" label="Ordem de exibicao"></app-input-numerico>
              </div>
              <app-input-textarea [control]="descricaoCurtaControl" label="Descricao curta" [rows]="2" [maxlength]="500"></app-input-textarea>
              <div class="rich-field">
                <label>Descricao completa</label>
                <p>Use esta area para textos comerciais, instrucoes e informacoes detalhadas. As especificacoes tecnicas devem ser cadastradas nos campos da categoria.</p>
                <app-rich-text-editor formControlName="descricaoCompleta" placeholder="Digite a descricao completa do produto" [minHeight]="180" [maxLength]="10000"></app-rich-text-editor>
                <button mat-stroked-button type="button" class="preview-button" (click)="visualizarDescricao = !visualizarDescricao">
                  <mat-icon>visibility</mat-icon>
                  Visualizar descricao
                </button>
                <div class="preview" *ngIf="visualizarDescricao" [innerHTML]="form.value.descricaoCompleta || '<p>Nenhuma descricao informada.</p>'"></div>
              </div>
              <div class="toggles"><mat-slide-toggle formControlName="destaque">Destaque</mat-slide-toggle><mat-slide-toggle formControlName="ativo">Ativo</mat-slide-toggle></div>
            </app-section-card>
          </mat-tab>

          <mat-tab label="Comercial">
            <app-section-card titulo="Configuracao comercial" subtitulo="Preco, consulta e orcamento">
              <div class="grid comercial">
                <app-input-moeda [control]="precoVendaControl" label="Preco de venda"></app-input-moeda>
                <app-input-moeda [control]="precoPromocionalControl" label="Preco promocional"></app-input-moeda>
              </div>
              <div class="toggles"><mat-slide-toggle formControlName="exibirPreco">Exibir preco</mat-slide-toggle><mat-slide-toggle formControlName="sobConsulta">Sob consulta</mat-slide-toggle><mat-slide-toggle formControlName="permiteOrcamento">Permite orcamento</mat-slide-toggle></div>
            </app-section-card>
          </mat-tab>

          <mat-tab label="Imagens">
            <app-section-card titulo="Imagens do produto" subtitulo="Upload, principal e ordenacao">
              <app-deposito-imagem-galeria context="catalogo-produtos" [gerenciarPrincipal]="true" [imagemPrincipal]="imagemPrincipal" [imagens]="galeria" (imagemPrincipalChange)="imagemPrincipal = $event; markDirty()" (imagensChange)="galeria = $event; markDirty()" (uploadingChange)="uploading = $event"></app-deposito-imagem-galeria>
            </app-section-card>
          </mat-tab>

          <mat-tab label="Caracteristicas">
            <app-section-card titulo="Caracteristicas dinamicas" subtitulo="Campos definidos pela categoria selecionada">
              <div class="loading" *ngIf="carregandoEstrutura"><mat-spinner diameter="24"></mat-spinner><span>Carregando caracteristicas...</span></div>
              <app-catalogo-produto-caracteristicas #caracteristicasEditor [definicoes]="definicoes" [valores]="valoresCaracteristicas"></app-catalogo-produto-caracteristicas>
            </app-section-card>
          </mat-tab>

          <mat-tab *ngIf="exibirAbaCalculadoraMateriais" label="Calculadora de Materiais">
            <app-produto-calculadora-materiais-tab
              *ngIf="produtoId"
              [produtoId]="produtoId">
            </app-produto-calculadora-materiais-tab>
          </mat-tab>
        </mat-tab-group>
        <div class="actions"><button mat-stroked-button type="button" (click)="voltar()">Voltar</button><button mat-flat-button color="primary" type="submit" [disabled]="salvando || uploading">{{ salvando ? 'Salvando...' : 'Salvar' }}</button></div>
      </form>
    </app-page-card>
  `,
  styles: [`.grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px}.comercial{grid-template-columns:repeat(2,minmax(0,220px))}.toggles,.actions{display:flex; gap:16px; justify-content:flex-end; margin-top:16px}mat-tab-group{margin-top:8px}.rich-field{margin-top:8px}.rich-field label{display:block;font-weight:600;margin-bottom:4px}.rich-field p{color:#6b7280;margin:0 0 8px}.preview-button{margin-top:10px}.preview{border:1px solid #e5eaef;border-radius:8px;padding:12px;margin-top:10px;background:#f8fafc}.loading{display:flex;align-items:center;gap:10px;color:#6b7280;margin-bottom:12px}@media(max-width:900px){.grid,.comercial{grid-template-columns:1fr}.actions{flex-direction:column}}`],
})
export class CatalogoProdutoFormComponent implements OnInit, OnDestroy, CanDeactivateWithPendingChanges {
  @ViewChild('caracteristicasEditor') caracteristicasEditor?: CatalogoProdutoCaracteristicasComponent;
  form = this.fb.group({
    codigo: ['', Validators.required],
    nome: ['', Validators.required],
    slug: ['', Validators.required],
    descricaoCurta: ['', Validators.maxLength(500)],
    descricaoCompleta: [''],
    categoriaId: [null as number | null, Validators.required],
    marcaId: [null as number | null],
    unidadeVenda: ['UNIDADE', Validators.required],
    ordemExibicao: [0, Validators.min(0)],
    destaque: [false],
    ativo: [true],
    precoVenda: [null as number | null, Validators.min(0)],
    precoPromocional: [null as number | null, Validators.min(0)],
    exibirPreco: [true],
    sobConsulta: [false],
    permiteOrcamento: [true],
  });

  get codigoControl(): FormControl { return this.form.controls.codigo as FormControl; }
  get nomeControl(): FormControl { return this.form.controls.nome as FormControl; }
  get slugControl(): FormControl { return this.form.controls.slug as FormControl; }
  get descricaoCurtaControl(): FormControl { return this.form.controls.descricaoCurta as FormControl; }
  get descricaoCompletaControl(): FormControl { return this.form.controls.descricaoCompleta as FormControl; }
  get ordemExibicaoControl(): FormControl { return this.form.controls.ordemExibicao as FormControl; }
  get precoVendaControl(): FormControl { return this.form.controls.precoVenda as FormControl; }
  get precoPromocionalControl(): FormControl { return this.form.controls.precoPromocional as FormControl; }

  categorias: CatalogoCategoriaOption[] = [];
  marcas: CatalogoMarcaOption[] = [];
  unidades = CATALOGO_UNIDADES_VENDA;
  definicoes: CatalogoCaracteristica[] = [];
  valoresCaracteristicas: NonNullable<CatalogoProduto['caracteristicas']> = [];
  produtoAtual?: CatalogoProduto;
  imagemPrincipal: any = null;
  galeria: any[] = [];
  isEdit = false;
  produtoId?: number;
  salvando = false;
  uploading = false;
  salvo = false;
  slugManual = false;
  visualizarDescricao = false;
  carregandoEstrutura = false;
  selectedTabIndex = 0;
  exibirAbaCalculadoraMateriais = false;
  readonly abas = ['dados-gerais', 'comercial', 'imagens', 'caracteristicas'];
  readonly calculadoraMateriaisTabKey = 'calculadora-materiais';
  private categoriaAnteriorId: number | null = null;
  private readonly destroy$ = new Subject<void>();
  private queryParamTab: string | null = null;
  private moduloCalculadoraMateriaisHabilitado = false;
  private permissaoCalculadoraMateriais = false;

  constructor(private readonly fb: FormBuilder, private readonly produtoService: CatalogoProdutoService, private readonly categoriaService: CatalogoCategoriaService, private readonly marcaService: CatalogoMarcaService, private readonly route: ActivatedRoute, private readonly router: Router, private readonly toastr: ToastrService, private readonly dialog: MatDialog, private readonly auth: AuthService, private readonly featureFlagService: FeatureFlagService) {}

  ngOnInit(): void {
    forkJoin({ categorias: this.categoriaService.options(true), marcas: this.marcaService.options(true) }).subscribe({ next: ({ categorias, marcas }) => { this.categorias = categorias || []; this.marcas = marcas || []; } });
    this.form.controls.nome.valueChanges.subscribe((nome) => { if (!this.slugManual) this.form.controls.slug.setValue(catalogoSlugify(nome || ''), { emitEvent: false }); });
    this.form.controls.sobConsulta.valueChanges.subscribe((sobConsulta) => this.atualizarValidacaoPreco(!!sobConsulta));
    this.form.controls.exibirPreco.valueChanges.subscribe(() => this.atualizarValidacaoPreco(!!this.form.value.sobConsulta));
    this.queryParamTab = this.route.snapshot.queryParamMap.get('tab');
    this.carregarDisponibilidadeCalculadoraMateriais();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.isEdit = true;
      this.produtoId = id;
      this.atualizarAbas();
      this.produtoService.detalhar(id).subscribe({
        next: (produto) => this.aplicarProduto(produto),
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Produto nao encontrado.')),
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index;
  }

  onCategoriaChange(categoriaId: number | null): void {
    if (!categoriaId) {
      this.definicoes = [];
      this.valoresCaracteristicas = [];
      this.categoriaAnteriorId = null;
      return;
    }
    const precisaConfirmar = this.categoriaAnteriorId && this.categoriaAnteriorId !== categoriaId && this.caracteristicasEditor?.hasAnyValue();
    if (!precisaConfirmar) {
      this.valoresCaracteristicas = this.caracteristicasEditor?.currentValues() || this.valoresCaracteristicas || [];
      this.carregarEstrutura(categoriaId, this.valoresCaracteristicas || []);
      this.categoriaAnteriorId = categoriaId;
      this.markDirty();
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Alterar categoria',
        message: 'Alterar a categoria pode remover caracteristicas tecnicas que nao existem na nova categoria. Deseja continuar?',
        cancelText: 'Cancelar',
        confirmText: 'Alterar categoria',
        confirmColor: 'primary',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        this.form.controls.categoriaId.setValue(this.categoriaAnteriorId, { emitEvent: false });
        return;
      }
      const valoresAtuais = this.caracteristicasEditor?.currentValues() || [];
      this.carregarEstrutura(categoriaId, valoresAtuais);
      this.categoriaAnteriorId = categoriaId;
      this.markDirty();
    });
  }

  salvar(): void {
    if (this.form.invalid || this.uploading) {
      this.form.markAllAsTouched();
      this.selectedTabIndex = this.indicePrimeiraAbaInvalida();
      this.toastr.warning('Revise os campos obrigatorios do produto.');
      return;
    }
    if (this.caracteristicasEditor && !this.caracteristicasEditor.isValid()) {
      this.caracteristicasEditor.markAllAsTouched();
      this.toastr.warning('Revise as caracteristicas obrigatorias.');
      return;
    }
    if (!this.validarComercial()) return;
    this.salvando = true;
    const payload = this.buildPayload();
    const request$ = this.isEdit && this.produtoId ? this.produtoService.atualizar(this.produtoId, payload) : this.produtoService.criar(payload);
    request$.subscribe({
      next: (produto) => {
        this.salvando = false;
        this.salvo = true;
        this.form.markAsPristine();
        this.toastr.success(this.isEdit ? 'Produto atualizado.' : 'Produto criado.');
        if (!this.isEdit) this.router.navigate(['/page/catalogo/produtos', produto.id, 'editar']);
        else this.aplicarProduto(produto);
      },
      error: (error) => { this.salvando = false; this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel salvar o produto.')); },
    });
  }

  markDirty(): void { this.form.markAsDirty(); }
  voltar(): void { this.router.navigate(['/page/catalogo/produtos']); }
  hasPendingChanges(): boolean { return !this.salvo && this.form.dirty && !this.salvando; }

  private aplicarProduto(produto: CatalogoProduto): void {
    this.produtoAtual = produto;
    this.form.patchValue({
      codigo: produto.codigo,
      nome: produto.nome,
      slug: produto.slug,
      descricaoCurta: produto.descricaoCurta || '',
      descricaoCompleta: produto.descricaoCompleta || '',
      categoriaId: produto.categoria?.id || null,
      marcaId: produto.marca?.id || null,
      unidadeVenda: produto.unidadeVenda || 'UNIDADE',
      ordemExibicao: produto.ordemExibicao ?? 0,
      destaque: !!produto.destaque,
      ativo: produto.ativo !== false,
      precoVenda: produto.comercial?.precoVenda ?? null,
      precoPromocional: produto.comercial?.precoPromocional ?? null,
      exibirPreco: produto.comercial?.exibirPreco !== false,
      sobConsulta: !!produto.comercial?.sobConsulta,
      permiteOrcamento: produto.comercial?.permiteOrcamento !== false,
    });
    const imagens = produto.imagens || [];
    this.imagemPrincipal = imagens.find((img) => img.principal && img.ativo !== false)?.arquivo || null;
    this.galeria = imagens.filter((img) => !img.principal && img.ativo !== false).map((img) => img.arquivo).filter(Boolean);
    if (produto.categoria?.id) this.carregarEstrutura(produto.categoria.id);
    this.valoresCaracteristicas = produto.caracteristicas || [];
    this.categoriaAnteriorId = produto.categoria?.id || null;
    this.form.markAsPristine();
  }

  private carregarDisponibilidadeCalculadoraMateriais(): void {
    this.permissaoCalculadoraMateriais = this.auth.temPermissao(CALCULADORA_MATERIAIS_PERMISSAO_CONFIGURAR);

    this.featureFlagService.carregar()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.moduloCalculadoraMateriaisHabilitado = this.featureFlagService.isEnabled(CALCULADORA_MATERIAIS_MODULO);
        this.atualizarAbas();
      });
  }

  private atualizarAbas(): void {
    const currentKey = this.abaKeyPorIndice(this.selectedTabIndex);
    this.exibirAbaCalculadoraMateriais = this.isEdit
      && this.moduloCalculadoraMateriaisHabilitado
      && this.permissaoCalculadoraMateriais;

    const requestedKey = this.queryParamTab === this.calculadoraMateriaisTabKey ? this.queryParamTab : null;
    const preferredKey = requestedKey || currentKey;
    this.selectedTabIndex = this.indicePorAbaKey(preferredKey);
  }

  private abaKeyPorIndice(index: number): string {
    const abasDisponiveis = this.abasDisponiveis();
    return abasDisponiveis[index] || this.abas[0];
  }

  private indicePorAbaKey(key: string | null): number {
    if (!key) return 0;
    const index = this.abasDisponiveis().indexOf(key);
    return index >= 0 ? index : 0;
  }

  private abasDisponiveis(): string[] {
    return this.exibirAbaCalculadoraMateriais
      ? [...this.abas, this.calculadoraMateriaisTabKey]
      : [...this.abas];
  }

  private carregarEstrutura(categoriaId: number, valoresParaPreservar?: CatalogoProduto['caracteristicas']): void {
    this.carregandoEstrutura = true;
    this.categoriaService.estruturaProduto(categoriaId).subscribe({
      next: (estrutura) => {
        this.definicoes = (estrutura.caracteristicas || []).sort((a, b) => (a.ordemExibicao ?? 0) - (b.ordemExibicao ?? 0));
        const ids = new Set(this.definicoes.map((item) => item.id));
        this.valoresCaracteristicas = (valoresParaPreservar || this.produtoAtual?.caracteristicas || []).filter((valor) => ids.has(valor.caracteristicaId));
        this.carregandoEstrutura = false;
      },
      error: (error) => {
        this.carregandoEstrutura = false;
        this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel carregar a estrutura da categoria.'));
      },
    });
  }

  private buildPayload(): CatalogoProdutoRequest {
    const raw = this.form.getRawValue();
    return {
      codigo: raw.codigo || '',
      nome: raw.nome || '',
      slug: raw.slug || '',
      descricaoCurta: raw.descricaoCurta || null,
      descricaoCompleta: raw.descricaoCompleta || null,
      categoriaId: raw.categoriaId,
      marcaId: raw.marcaId,
      unidadeVenda: raw.unidadeVenda as any,
      ordemExibicao: raw.ordemExibicao,
      destaque: !!raw.destaque,
      ativo: raw.ativo !== false,
      comercial: {
        precoVenda: raw.precoVenda,
        precoPromocional: raw.precoPromocional,
        exibirPreco: !!raw.exibirPreco,
        sobConsulta: !!raw.sobConsulta,
        permiteOrcamento: !!raw.permiteOrcamento,
      },
      imagens: this.buildImagensPayload(),
      caracteristicas: this.caracteristicasEditor?.buildPayload() || [],
    };
  }

  private buildImagensPayload(): CatalogoProdutoImagemRequest[] {
    const principalId = this.imagemPrincipal ? (this.imagemPrincipal.arquivoId ?? this.imagemPrincipal.id) : null;
    const imagens = [
      ...(principalId ? [{ arquivoId: principalId, principal: true, ordem: 0, ativo: true }] : []),
      ...this.galeria
        .map((imagem, index) => ({ arquivoId: imagem.arquivoId ?? imagem.id, principal: false, ordem: index + 1, ativo: true }))
        .filter((imagem) => !!imagem.arquivoId),
    ];
    const seen = new Set<number>();
    return imagens.filter((imagem) => {
      if (seen.has(imagem.arquivoId)) return false;
      seen.add(imagem.arquivoId);
      return true;
    });
  }

  private validarComercial(): boolean {
    const preco = this.form.value.precoVenda;
    const promo = this.form.value.precoPromocional;
    if (!this.form.value.sobConsulta && this.form.value.exibirPreco && (preco === null || preco === undefined)) {
      this.toastr.warning('Informe o preco de venda ou marque Sob consulta.');
      return false;
    }
    if (preco !== null && preco !== undefined && promo !== null && promo !== undefined && Number(promo) >= Number(preco)) {
      this.toastr.warning('O preco promocional deve ser menor que o preco de venda.');
      return false;
    }
    return true;
  }

  private atualizarValidacaoPreco(sobConsulta: boolean): void {
    const validators = [Validators.min(0)];
    if (!sobConsulta && this.form.value.exibirPreco) validators.push(Validators.required);
    this.form.controls.precoVenda.setValidators(validators);
    this.form.controls.precoVenda.updateValueAndValidity({ emitEvent: false });
  }

  private indicePrimeiraAbaInvalida(): number {
    const dadosGerais = ['codigo', 'nome', 'slug', 'categoriaId', 'unidadeVenda', 'ordemExibicao', 'descricaoCurta'];
    if (dadosGerais.some((control) => this.form.get(control)?.invalid)) return this.indicePorAbaKey('dados-gerais');

    const comercial = ['precoVenda', 'precoPromocional', 'exibirPreco', 'sobConsulta', 'permiteOrcamento'];
    if (comercial.some((control) => this.form.get(control)?.invalid)) return this.indicePorAbaKey('comercial');

    return this.selectedTabIndex;
  }
}
