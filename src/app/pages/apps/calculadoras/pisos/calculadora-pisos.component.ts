import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, finalize, takeUntil } from 'rxjs/operators';
import { UnitInputComponent } from 'src/app/components/inputs/unit-input/unit-input.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { ProdutoSelectorDialogComponent } from 'src/app/components/produto-selector/produto-selector-dialog.component';
import { ProdutoSelectorComponent } from 'src/app/components/produto-selector/produto-selector.component';
import { OrcamentoCriarRequest } from 'src/app/models/orcamento/orcamento.model';
import { MaterialModule } from 'src/app/material.module';
import { CALCULADORA_MATERIAIS_PERMISSAO_USAR } from 'src/app/pages/calculadora-materiais/shared/calculadora-material.models';
import { AuthService } from 'src/app/services/auth.service';
import { OrcamentoService } from 'src/app/services/orcamento.service';
import {
  CalculadoraMaterialModoMedicao,
  CalculadoraMaterialProdutoConsolidado,
  CalculadoraMaterialResumoConsolidado,
  CalculadoraPisoAmbienteRequest,
  CalculadoraPisoProduto,
  CalculadoraPisoResultado,
} from './calculadora-pisos.models';
import { CalculadoraPisosContatoOrcamento, CalculadoraPisosContatoOrcamentoDialogComponent } from './calculadora-pisos-contato-orcamento-dialog.component';
import { CalculadoraPisosService } from './calculadora-pisos.service';

type ItemMaterialForm = FormGroup<{
  id: FormControl<string>;
  produtoBusca: FormControl<string | CalculadoraPisoProduto | null>;
  produto: FormControl<CalculadoraPisoProduto | null>;
  modoMedicao: FormControl<CalculadoraMaterialModoMedicao>;
  largura: FormControl<number | null>;
  comprimento: FormControl<number | null>;
  areaTotal: FormControl<number | null>;
  quantidade: FormControl<number>;
  percentualPerda: FormControl<number | null>;
  perdaPreset: FormControl<number | 'OUTRO'>;
}>;

type AmbienteMaterialForm = FormGroup<{
  id: FormControl<string>;
  nome: FormControl<string>;
  expandido: FormControl<boolean>;
  itens: FormArray<ItemMaterialForm>;
}>;

@Component({
  selector: 'app-calculadora-pisos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    ProdutoSelectorComponent,
    UnitInputComponent,
    InputTextoRestritoComponent,
  ],
  templateUrl: './calculadora-pisos.component.html',
  styleUrls: ['./calculadora-pisos.component.scss'],
})
export class CalculadoraPisosComponent implements OnInit, OnDestroy {
  carregandoProdutoIds = new Set<string>();
  calculandoItemIds = new Set<string>();
  calculando = false;
  adicionando = false;
  erro = '';
  sucesso = '';
  resultadoDesatualizado = false;
  perdaOptions = [0, 5, 10, 15];
  resultadosPorItem = new Map<string, CalculadoraPisoResultado>();
  resultadosConsolidados: CalculadoraPisoResultado[] = [];
  detalhesAbertosIds = new Set<string>();
  produtosResumoAbertosIds = new Set<number>();
  trocandoProdutoIds = new Set<string>();
  modoOrcamento = new FormControl<'EXISTENTE' | 'NOVO'>('EXISTENTE', { nonNullable: true });
  orcamentoReferencia = new FormControl<string>('', { nonNullable: true });
  private readonly recalcular$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private revisaoFormulario = 0;
  private recalculoPendente = false;

  form = this.fb.group({
    ambientes: this.fb.array<AmbienteMaterialForm>([]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: CalculadoraPisosService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly orcamentoService: OrcamentoService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.addAmbiente();
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.revisaoFormulario += 1;
      if (this.resultadosPorItem.size > 0) this.resultadoDesatualizado = true;
      this.sucesso = '';
      this.recalcular$.next();
    });
    this.recalcular$.pipe(
      debounceTime(650),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.todosItens().length || !this.podeAdicionarAmbiente) return;
      if (this.calculando) {
        this.recalculoPendente = true;
        return;
      }
      this.calcular(true);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get ambientes(): FormArray<AmbienteMaterialForm> {
    return this.form.controls.ambientes;
  }

  get podeAdicionarOrcamento(): boolean {
    return this.auth.temPermissao(CALCULADORA_MATERIAIS_PERMISSAO_USAR)
      && (this.auth.temPermissao('ORCAMENTOS_EDITAR') || this.auth.temPermissao('ORCAMENTOS_CRIAR'));
  }

  get podeAdicionarAoOrcamentoExistente(): boolean {
    return this.auth.temPermissao(CALCULADORA_MATERIAIS_PERMISSAO_USAR)
      && this.auth.temPermissao('ORCAMENTOS_EDITAR');
  }

  get podeCriarOrcamento(): boolean {
    return this.auth.temPermissao(CALCULADORA_MATERIAIS_PERMISSAO_USAR)
      && this.auth.temPermissao('ORCAMENTOS_CRIAR');
  }

  get resumoConsolidado(): CalculadoraMaterialResumoConsolidado | null {
    if (!this.resultadosConsolidados.length) return null;

    const porProduto = new Map<number, CalculadoraMaterialProdutoConsolidado>();
    this.resultadosConsolidados.forEach((resultado) => {
      const produto = resultado.produto;
      const ambientes = resultado.ambientes.map((ambiente) => ambiente.nome);
      const atual = porProduto.get(produto.id);
      const valorUnitario = resultado.valorUnitario ?? null;
      if (!atual) {
        porProduto.set(produto.id, {
          produto,
          ambientes,
          resultados: [resultado],
          quantidadeCaixas: resultado.quantidadeCaixas,
          areaTotal: resultado.areaTotal,
          areaNecessaria: resultado.areaNecessaria,
          areaComprada: resultado.areaComprada,
          sobraEstimada: resultado.sobraEstimada,
          valorUnitario,
          valorTotal: resultado.valorTotal ?? null,
        });
        return;
      }

      ambientes.forEach((ambiente) => {
        if (!atual.ambientes.includes(ambiente)) atual.ambientes.push(ambiente);
      });
      atual.resultados.push(resultado);
      atual.quantidadeCaixas += resultado.quantidadeCaixas;
      atual.areaTotal += resultado.areaTotal;
      atual.areaNecessaria += resultado.areaNecessaria;
      atual.areaComprada += resultado.areaComprada;
      atual.sobraEstimada += resultado.sobraEstimada;
      const itemTotal = resultado.valorTotal ?? null;
      atual.valorTotal = itemTotal == null || atual.valorTotal == null ? null : atual.valorTotal + itemTotal;
    });

    const produtos = Array.from(porProduto.values());
    return {
      ambientes: new Set(this.resultadosConsolidados.flatMap((resultado) => resultado.ambientes.map((ambiente) => ambiente.nome))).size,
      produtos,
      produtosDiferentes: produtos.length,
      quantidadeCaixas: produtos.reduce((total, produto) => total + produto.quantidadeCaixas, 0),
      areaTotal: produtos.reduce((total, produto) => total + produto.areaTotal, 0),
      valorTotal: produtos.some((produto) => produto.valorTotal == null)
        ? null
        : produtos.reduce((total, produto) => total + (produto.valorTotal ?? 0), 0),
    };
  }

  get podeAdicionarResultado(): boolean {
    const resumo = this.resumoConsolidado;
    return !!resumo
      && resumo.valorTotal != null
      && resumo.produtos.every((produto) => produto.valorUnitario != null && produto.valorTotal != null)
      && !this.resultadoDesatualizado
      && !this.adicionando
      && this.podeAdicionarOrcamento;
  }

  get podeAdicionarAmbiente(): boolean {
    return this.todosItens().every(({ item }) => this.itemProntoParaCalculo(item));
  }

  buscarProdutos = (termo: string): Observable<CalculadoraPisoProduto[]> => {
    return this.service.buscarProdutos(termo);
  };

  itens(ambiente: AmbienteMaterialForm): FormArray<ItemMaterialForm> {
    return ambiente.controls.itens;
  }

  addAmbiente(base?: Partial<CalculadoraPisoAmbienteRequest> & { produto?: CalculadoraPisoProduto | null; percentualPerda?: number | null }): void {
    if (this.ambientes.length > 0 && !base && !this.podeAdicionarAmbiente) {
      this.erro = 'Conclua o ambiente atual antes de adicionar outro.';
      this.abrirPrimeiroAmbienteIncompleto();
      return;
    }
    this.erro = '';
    this.recolherTodosAmbientes();
    const ambiente = this.fb.group({
      id: this.fb.control(this.newId(), { nonNullable: true }),
      nome: this.fb.control(base?.nome || `Ambiente ${this.ambientes.length + 1}`, { nonNullable: true, validators: [Validators.required] }),
      expandido: this.fb.control(true, { nonNullable: true }),
      itens: this.fb.array<ItemMaterialForm>([]),
    });
    ambiente.controls.itens.push(this.criarItem(base));
    this.ambientes.push(ambiente);
    this.abrirPrimeiroAmbienteIncompleto();
  }

  duplicarAmbiente(index: number): void {
    if (!this.podeAdicionarAmbiente) {
      this.erro = 'Conclua o ambiente atual antes de duplicar.';
      this.abrirPrimeiroAmbienteIncompleto();
      return;
    }
    const ambiente = this.ambientes.at(index);
    const primeiroItem = this.itens(ambiente).at(0);
    this.addAmbiente({
      nome: `${ambiente.controls.nome.value} copia`,
      produto: primeiroItem.controls.produto.value,
      largura: primeiroItem.controls.largura.value || 0,
      comprimento: primeiroItem.controls.comprimento.value || 0,
      quantidade: primeiroItem.controls.quantidade.value || 1,
      percentualPerda: primeiroItem.controls.percentualPerda.value,
    });
  }

  removerAmbiente(index: number): void {
    if (this.ambientes.length === 1) {
      this.erro = 'A calculadora precisa de ao menos um ambiente.';
      return;
    }
    this.itens(this.ambientes.at(index)).controls.forEach((item) => this.resultadosPorItem.delete(item.controls.id.value));
    this.ambientes.removeAt(index);
    this.abrirPrimeiroAmbienteIncompleto();
  }

  toggleAmbiente(ambiente: AmbienteMaterialForm): void {
    const abrir = !ambiente.controls.expandido.value;
    this.recolherTodosAmbientes();
    if (abrir) ambiente.controls.expandido.setValue(true, { emitEvent: false });
  }

  selecionarProduto(ambiente: AmbienteMaterialForm, item: ItemMaterialForm, produtoBusca: CalculadoraPisoProduto): void {
    this.erro = '';
    const itemId = item.controls.id.value;
    this.carregandoProdutoIds.add(itemId);
    this.service.consultarProduto(produtoBusca.id).pipe(
      catchError(() => {
        this.erro = 'Não foi possível carregar a configuração do produto.';
        return of(null);
      }),
      finalize(() => this.carregandoProdutoIds.delete(itemId))
    ).subscribe((configuracao) => {
      if (!configuracao) return;
      const produto = {
        ...produtoBusca,
        ...configuracao,
        id: produtoBusca.id,
        codigo: produtoBusca.codigo,
        nome: produtoBusca.nome,
      };
      item.patchValue({
        produto,
        produtoBusca: produto,
        percentualPerda: produto.perdaPadraoPercentual ?? 0,
        perdaPreset: this.perdaPreset(produto.perdaPadraoPercentual ?? 0),
      }, { emitEvent: false });
      this.resultadosPorItem.delete(itemId);
      this.trocandoProdutoIds.delete(itemId);
      this.abrirSomenteAmbiente(ambiente);
      this.resultadoDesatualizado = this.resultadosPorItem.size > 0;
      this.revisaoFormulario += 1;
      this.recalcular$.next();
    });
  }

  abrirTodosProdutos(ambiente: AmbienteMaterialForm, item: ItemMaterialForm): void {
    const ref = this.dialog.open(ProdutoSelectorDialogComponent, {
      width: '720px',
      maxWidth: '94vw',
      data: { buscarFn: this.buscarProdutos },
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    ref.afterClosed().subscribe((produto?: CalculadoraPisoProduto | null) => {
      if (produto) this.selecionarProduto(ambiente, item, produto);
    });
  }

  trocarProduto(item: ItemMaterialForm): void {
    const itemId = item.controls.id.value;
    item.patchValue({ produto: null, produtoBusca: '' }, { emitEvent: false });
    this.resultadosPorItem.delete(itemId);
    this.resultadosConsolidados = [];
    this.trocandoProdutoIds.add(itemId);
    this.revisaoFormulario += 1;
  }

  itemTrocandoProduto(item: ItemMaterialForm): boolean {
    return this.trocandoProdutoIds.has(item.controls.id.value);
  }

  selecionarPerda(item: ItemMaterialForm, value: number | 'OUTRO'): void {
    item.controls.perdaPreset.setValue(value, { emitEvent: false });
    if (value !== 'OUTRO') item.controls.percentualPerda.setValue(value);
  }

  perdaPersonalizada(item: ItemMaterialForm): boolean {
    return item.controls.perdaPreset.value === 'OUTRO';
  }

  toggleDetalhes(item: ItemMaterialForm): void {
    const id = item.controls.id.value;
    this.detalhesAbertosIds.has(id) ? this.detalhesAbertosIds.delete(id) : this.detalhesAbertosIds.add(id);
  }

  detalhesAbertos(item: ItemMaterialForm): boolean {
    return this.detalhesAbertosIds.has(item.controls.id.value);
  }

  toggleProdutoResumo(produtoId: number): void {
    this.produtosResumoAbertosIds.has(produtoId)
      ? this.produtosResumoAbertosIds.delete(produtoId)
      : this.produtosResumoAbertosIds.add(produtoId);
  }

  produtoResumoAberto(produtoId: number): boolean {
    return this.produtosResumoAbertosIds.has(produtoId);
  }

  precoItem(item: ItemMaterialForm): number | null {
    return this.resultadoItem(item)?.valorUnitario ?? null;
  }

  totalItem(item: ItemMaterialForm): number | null {
    return this.resultadoItem(item)?.valorTotal ?? null;
  }

  camposPendentes(item: ItemMaterialForm): string {
    const pendentes: string[] = [];
    if (!item.controls.produto.value) pendentes.push('produto');
    if (item.controls.modoMedicao.value === 'AREA_TOTAL') {
      if (!item.controls.areaTotal.value) pendentes.push('área total');
    } else {
      if (!item.controls.largura.value) pendentes.push('largura');
      if (!item.controls.comprimento.value) pendentes.push('comprimento');
    }
    if (!item.controls.quantidade.value) pendentes.push('quantidade');
    return pendentes.join(', ');
  }

  calculoArredondamento(resultado: CalculadoraPisoResultado): string {
    const cobertura = resultado.produto.metragemPorEmbalagem;
    if (!cobertura) return 'Quantidade ajustada conforme a configuração comercial do produto.';
    return `${this.formatNumber(resultado.areaNecessaria)} m² ÷ ${this.formatNumber(cobertura)} m² por embalagem, com arredondamento comercial.`;
  }

  calcular(silencioso = false): void {
    if (this.calculando) {
      this.recalculoPendente = true;
      return;
    }
    this.erro = '';
    this.sucesso = '';
    if (!silencioso) this.form.markAllAsTouched();

    const itensCalculaveis = this.itensCalculaveis();
    if (!itensCalculaveis.length) {
      this.erro = 'Selecione ao menos um produto e informe medidas válidas.';
      return;
    }

    const invalidos = this.todosItens().filter(({ item }) => !this.itemProntoParaCalculo(item));
    if (invalidos.length) {
      this.erro = 'Revise os ambientes com produto ou medidas incompletas antes de calcular.';
      return;
    }

    this.calculando = true;
    const revisaoCalculo = this.revisaoFormulario;
    itensCalculaveis.forEach(({ item }) => this.calculandoItemIds.add(item.controls.id.value));

    forkJoin(itensCalculaveis.map(({ ambiente, item }) => {
      const produto = item.controls.produto.value!;
      return this.service.calcular({
        produtoId: produto.id,
        percentualPerda: Number(item.controls.percentualPerda.value || 0),
        ambientes: [this.ambientePayload(ambiente, item)],
      }).pipe(
        catchError(() => of(null)),
        finalize(() => this.calculandoItemIds.delete(item.controls.id.value))
      );
    })).subscribe((resultados) => {
      if (revisaoCalculo !== this.revisaoFormulario) {
        this.recalculoPendente = true;
        this.concluirCalculo();
        return;
      }
      let falhas = 0;
      resultados.forEach((resultado, index) => {
        const item = itensCalculaveis[index].item;
        if (!resultado) {
          falhas += 1;
          this.resultadosPorItem.delete(item.controls.id.value);
          return;
        }
        const produto = item.controls.produto.value!;
        this.resultadosPorItem.set(item.controls.id.value, {
          ...resultado,
          produto: {
            ...resultado.produto,
            ...produto,
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
          },
        });
      });
      this.resultadoDesatualizado = false;
      if (falhas) this.erro = 'Alguns itens não puderam ser calculados. Os demais resultados foram preservados.';
      if (falhas) {
        this.concluirCalculo();
        return;
      }
      this.calcularResumoConsolidado(itensCalculaveis, revisaoCalculo);
    });
  }

  adicionarAoOrcamento(): void {
    const resumo = this.resumoConsolidado;
    if (!resumo || this.resultadoDesatualizado || !this.podeAdicionarOrcamento) return;

    if (this.modoOrcamento.value === 'NOVO') {
      if (!this.podeCriarOrcamento) {
        this.erro = 'Você não possui permissão para criar orçamento.';
        return;
      }
      this.abrirContatoNovoOrcamento();
      return;
    }

    if (!this.podeAdicionarAoOrcamentoExistente) {
      this.erro = 'Você não possui permissão para editar orçamento.';
      return;
    }

    const referenciaOrcamento = this.orcamentoReferencia.value.trim();
    if (!referenciaOrcamento) {
      this.erro = 'Informe o código do orçamento que receberá os itens.';
      return;
    }

    this.adicionando = true;
    forkJoin(this.resultadosConsolidados.map((resultado) => this.service.adicionarAoOrcamento({
      orcamentoReferencia: referenciaOrcamento,
      resultado,
    }))).pipe(finalize(() => (this.adicionando = false))).subscribe({
      next: (responses) => {
        this.sucesso = `${responses.length} item(ns) adicionados ao orçamento.`;
        const pedidoId = responses[0]?.pedidoId;
        if (pedidoId) this.router.navigate(['/page/orcamentos', pedidoId]);
      },
      error: () => {
        this.erro = 'Não foi possível adicionar os itens ao orçamento.';
      },
    });
  }

  areaItem(item: ItemMaterialForm): number {
    if (item.controls.modoMedicao.value === 'AREA_TOTAL') {
      return Number(item.controls.areaTotal.value || 0) * Number(item.controls.quantidade.value || 0);
    }
    return Number(item.controls.largura.value || 0)
      * Number(item.controls.comprimento.value || 0)
      * Number(item.controls.quantidade.value || 0);
  }

  resultadoItem(item: ItemMaterialForm): CalculadoraPisoResultado | null {
    return this.resultadosPorItem.get(item.controls.id.value) || null;
  }

  itemCarregandoProduto(item: ItemMaterialForm): boolean {
    return this.carregandoProdutoIds.has(item.controls.id.value);
  }

  itemCalculando(item: ItemMaterialForm): boolean {
    return this.calculandoItemIds.has(item.controls.id.value);
  }

  itemProntoParaCalculo(item: ItemMaterialForm): boolean {
    const produto = item.controls.produto.value;
    return !!produto?.ativo
      && !!produto?.metragemPorEmbalagem
      && produto.metragemPorEmbalagem > 0
      && this.areaItem(item) > 0
      && Number(item.controls.quantidade.value || 0) > 0
      && Number(item.controls.percentualPerda.value ?? -1) >= 0;
  }

  produtoPendente(item: ItemMaterialForm): boolean {
    const produto = item.controls.produto.value;
    return !!produto && (!produto.ativo || !produto.metragemPorEmbalagem || produto.metragemPorEmbalagem <= 0);
  }

  avisosProduto(item: ItemMaterialForm): string[] {
    const produto = item.controls.produto.value;
    if (!produto) return [];
    const avisos = [...(produto.pendencias || [])];
    if (!produto.metragemPorEmbalagem || produto.metragemPorEmbalagem <= 0) avisos.push('Cobertura por embalagem não configurada.');
    if (!produto.ativo) avisos.push('Produto inativo para cálculo.');
    return Array.from(new Set(avisos));
  }

  abrirConfiguracaoProduto(item: ItemMaterialForm): void {
    const produto = item.controls.produto.value;
    if (!produto) return;
    this.router.navigate(['/page/cadastro-tecnico/produtos/editar', produto.id], {
      queryParams: { tab: 'calculadora-materiais' },
    });
  }

  formatNumber(value?: number | null): string {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  pluralUnidade(quantidade: number, singular = 'caixa', plural = 'caixas'): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }

  currency(value?: number | null): string {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private criarItem(base?: Partial<CalculadoraPisoAmbienteRequest> & { produto?: CalculadoraPisoProduto | null; percentualPerda?: number | null }): ItemMaterialForm {
    const produto = base?.produto || null;
    return this.fb.group({
      id: this.fb.control(this.newId(), { nonNullable: true }),
      produtoBusca: this.fb.control<string | CalculadoraPisoProduto | null>(produto),
      produto: this.fb.control<CalculadoraPisoProduto | null>(produto),
      modoMedicao: this.fb.control<CalculadoraMaterialModoMedicao>('MEDIDAS', { nonNullable: true }),
      largura: this.fb.control<number | null>(base?.largura || null),
      comprimento: this.fb.control<number | null>(base?.comprimento || null),
      areaTotal: this.fb.control<number | null>(null),
      quantidade: this.fb.control(base?.quantidade || 1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
      percentualPerda: this.fb.control<number | null>(base?.percentualPerda ?? produto?.perdaPadraoPercentual ?? 0, [Validators.required, Validators.min(0), Validators.max(100)]),
      perdaPreset: this.fb.control<number | 'OUTRO'>(this.perdaPreset(base?.percentualPerda ?? produto?.perdaPadraoPercentual ?? 0), { nonNullable: true }),
    });
  }

  private perdaPreset(value: number): number | 'OUTRO' {
    return this.perdaOptions.includes(value) ? value : 'OUTRO';
  }

  private recolherTodosAmbientes(): void {
    this.ambientes.controls.forEach((ambiente) => ambiente.controls.expandido.setValue(false, { emitEvent: false }));
  }

  private abrirSomenteAmbiente(ambienteAlvo: AmbienteMaterialForm): void {
    this.recolherTodosAmbientes();
    ambienteAlvo.controls.expandido.setValue(true, { emitEvent: false });
  }

  private abrirPrimeiroAmbienteIncompleto(): void {
    const incompleto = this.ambientes.controls.find((ambiente) =>
      this.itens(ambiente).controls.some((item) => !this.itemProntoParaCalculo(item))
    );
    if (incompleto) {
      this.abrirSomenteAmbiente(incompleto);
      return;
    }
    if (this.ambientes.length > 0 && !this.ambientes.controls.some((ambiente) => ambiente.controls.expandido.value)) {
      this.ambientes.at(0).controls.expandido.setValue(true, { emitEvent: false });
    }
  }

  private todosItens(): Array<{ ambiente: AmbienteMaterialForm; item: ItemMaterialForm }> {
    return this.ambientes.controls.flatMap((ambiente) => this.itens(ambiente).controls.map((item) => ({ ambiente, item })));
  }

  private itensCalculaveis(): Array<{ ambiente: AmbienteMaterialForm; item: ItemMaterialForm }> {
    return this.todosItens().filter(({ item }) => this.itemProntoParaCalculo(item));
  }

  private calcularResumoConsolidado(
    itensCalculaveis: Array<{ ambiente: AmbienteMaterialForm; item: ItemMaterialForm }>,
    revisaoCalculo: number
  ): void {
    const grupos = new Map<string, {
      produto: CalculadoraPisoProduto;
      percentualPerda: number;
      ambientes: CalculadoraPisoAmbienteRequest[];
    }>();

    itensCalculaveis.forEach(({ ambiente, item }) => {
      const produto = item.controls.produto.value!;
      const percentualPerda = Number(item.controls.percentualPerda.value || 0);
      const chave = `${produto.id}:${percentualPerda}`;
      const grupo = grupos.get(chave) || { produto, percentualPerda, ambientes: [] };
      grupo.ambientes.push(this.ambientePayload(ambiente, item));
      grupos.set(chave, grupo);
    });

    forkJoin(Array.from(grupos.values()).map((grupo) => this.service.calcular({
      produtoId: grupo.produto.id,
      percentualPerda: grupo.percentualPerda,
      ambientes: grupo.ambientes,
    }).pipe(
      catchError(() => of(null))
    ))).subscribe((resultados) => {
      if (revisaoCalculo !== this.revisaoFormulario) {
        this.recalculoPendente = true;
        this.concluirCalculo();
        return;
      }
      const consolidados = resultados.filter((resultado): resultado is CalculadoraPisoResultado => !!resultado);
      this.resultadosConsolidados = consolidados.map((resultado) => {
        const produto = Array.from(grupos.values()).find((grupo) => grupo.produto.id === resultado.produto.id)?.produto;
        return produto ? {
          ...resultado,
          produto: {
            ...resultado.produto,
            ...produto,
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
          },
        } : resultado;
      });
      if (consolidados.length !== grupos.size) {
        this.erro = 'Não foi possível consolidar todos os produtos. Tente calcular novamente.';
      }
      this.resultadoDesatualizado = false;
      this.concluirCalculo();
    });
  }

  private concluirCalculo(): void {
    this.calculando = false;
    if (!this.recalculoPendente) return;
    this.recalculoPendente = false;
    this.recalcular$.next();
  }

  private ambientePayload(ambiente: AmbienteMaterialForm, item: ItemMaterialForm): CalculadoraPisoAmbienteRequest {
    const quantidade = Number(item.controls.quantidade.value || 1);
    if (item.controls.modoMedicao.value === 'AREA_TOTAL') {
      return {
        nome: ambiente.controls.nome.value,
        largura: Number(item.controls.areaTotal.value || 0),
        comprimento: 1,
        quantidade,
      };
    }
    return {
      nome: ambiente.controls.nome.value,
      largura: Number(item.controls.largura.value || 0),
      comprimento: Number(item.controls.comprimento.value || 0),
      quantidade,
    };
  }

  private abrirContatoNovoOrcamento(): void {
    const ref = this.dialog.open(CalculadoraPisosContatoOrcamentoDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });

    ref.afterClosed().subscribe((contato?: CalculadoraPisosContatoOrcamento | null) => {
      if (!contato) return;
      this.criarOrcamentoComResultado(contato);
    });
  }

  private criarOrcamentoComResultado(contato: CalculadoraPisosContatoOrcamento): void {
    const resumo = this.resumoConsolidado;
    if (!resumo) return;
    this.adicionando = true;
    this.orcamentoService.criar(this.buildOrcamentoPayload(resumo.produtos, contato)).pipe(
      finalize(() => (this.adicionando = false))
    ).subscribe({
      next: (orcamento) => {
        this.sucesso = 'Orçamento criado com os itens calculados.';
        this.router.navigate(['/page/orcamentos', orcamento.id]);
      },
      error: () => {
        this.erro = 'Não foi possível criar o orçamento com os itens calculados.';
      },
    });
  }

  private buildOrcamentoPayload(produtos: CalculadoraMaterialProdutoConsolidado[], contato: CalculadoraPisosContatoOrcamento): OrcamentoCriarRequest {
    return {
      nomeContato: contato.nomeContato,
      telefoneContato: contato.telefoneContato,
      emailContato: null,
      clienteId: null,
      observacaoGeral: 'Orçamento criado pela Calculadora de Materiais.',
      origem: 'BALCAO',
      itens: produtos.map((produto) => ({
        tipoItem: 'CATALOGO',
        produtoId: produto.produto.id,
        descricao: `${produto.produto.nome} - ${produto.ambientes.join(', ')}`,
        unidade: produto.produto.unidadeVenda || 'UNIDADE',
        quantidade: produto.quantidadeCaixas,
        valorUnitario: produto.valorUnitario!,
        desconto: null,
        observacao: `Calculadora de Materiais: ambientes ${produto.ambientes.join(', ')}. Área necessária ${this.formatNumber(produto.areaNecessaria)} m², área comprada ${this.formatNumber(produto.areaComprada)} m².`,
      })),
    };
  }

  private newId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
