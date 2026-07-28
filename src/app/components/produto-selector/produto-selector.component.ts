import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { CalculadoraPisoProduto } from 'src/app/pages/apps/calculadoras/pisos/calculadora-pisos.models';

@Component({
  selector: 'app-produto-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <div class="produto-selector">
      <mat-label class="f-s-14 f-w-600 m-b-8 d-block">{{ label }}</mat-label>
      <mat-form-field appearance="outline" class="w-100">
        <input
          matInput
          [formControl]="control"
          [matAutocomplete]="autoProduto"
          [placeholder]="placeholder"
          autocomplete="off"
          (focus)="abrirProdutos()"
          (click)="abrirProdutos()" />
        <mat-progress-spinner matSuffix *ngIf="loading" mode="indeterminate" diameter="18"></mat-progress-spinner>
        <mat-autocomplete
          #autoProduto="matAutocomplete"
          [displayWith]="displayProduto"
          (optionSelected)="selecionarProduto($event)">
          <mat-option *ngFor="let produto of produtos" [value]="produto">
            <div class="produto-option">
              <strong>{{ produto.codigo || 'Sem código' }} · {{ produto.nome }}</strong>
              <small>{{ produto.marca || 'Sem marca' }} · {{ produto.unidadeVenda || 'Unidade' }} · {{ formatNumber(produto.metragemPorEmbalagem) }} m²/emb.</small>
            </div>
          </mat-option>
          <mat-option disabled *ngIf="buscaExecutada && !loading && produtos.length === 0">
            Nenhum produto configurado encontrado
          </mat-option>
          <mat-option disabled *ngIf="!buscaExecutada && !loading">
            Clique para listar produtos configurados
          </mat-option>
          <button
            type="button"
            class="ver-todos-option"
            *ngIf="buscaExecutada && !loading"
            (mousedown)="$event.preventDefault()"
            (click)="abrirTodos($event)">
            <mat-icon>list</mat-icon>
            Ver todos os produtos
          </button>
        </mat-autocomplete>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .produto-option { display: grid; gap: 2px; line-height: 1.25; min-width: 0; }
    .produto-option strong { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .produto-option small { color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ver-todos-option {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 48px;
      border: 0;
      border-top: 1px solid #e5eaef;
      padding: 0 16px;
      background: #fff;
      color: var(--mat-sys-primary, #155eef);
      font: inherit;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }
    .ver-todos-option:hover { background: #f8fafc; }
  `],
})
export class ProdutoSelectorComponent {
  @Input({ required: true }) control!: FormControl<string | CalculadoraPisoProduto | null>;
  @Input({ required: true }) buscarFn!: (termo: string) => Observable<CalculadoraPisoProduto[]>;
  @Input() label = 'Produto';
  @Input() placeholder = 'Digite o código, nome ou clique para escolher';
  @Output() produtoSelecionado = new EventEmitter<CalculadoraPisoProduto>();
  @Output() verTodosProdutos = new EventEmitter<void>();

  @ViewChild(MatAutocompleteTrigger) trigger?: MatAutocompleteTrigger;

  produtos: CalculadoraPisoProduto[] = [];
  loading = false;
  buscaExecutada = false;
  private suspenderPainel = false;

  ngOnInit(): void {
    this.control.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((value) => {
        if (typeof value !== 'string') return of([]);
        return this.buscar(value);
      })
    ).subscribe((produtos) => {
      this.produtos = produtos;
      this.reabrirPainel();
    });
  }

  displayProduto(produto?: string | CalculadoraPisoProduto | null): string {
    return typeof produto === 'string' ? produto : produto ? `${produto.codigo || ''} ${produto.nome}`.trim() : '';
  }

  selecionarProduto(event: MatAutocompleteSelectedEvent): void {
    this.produtoSelecionado.emit(event.option.value as CalculadoraPisoProduto);
  }

  abrirTodos(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.suspenderPainel = true;
    this.trigger?.closePanel();
    setTimeout(() => {
      this.trigger?.closePanel();
      this.verTodosProdutos.emit();
    }, 0);
  }

  abrirProdutos(): void {
    this.suspenderPainel = false;
    const value = this.control.value;
    const termo = typeof value === 'string' ? value : '';
    this.buscar(termo).subscribe((produtos) => {
      this.produtos = produtos;
      this.reabrirPainel();
    });
  }

  formatNumber(value?: number | null): string {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private buscar(termo: string): Observable<CalculadoraPisoProduto[]> {
    this.loading = true;
    return this.buscarFn(termo || '').pipe(
      catchError(() => of([])),
      finalize(() => {
        this.loading = false;
        this.buscaExecutada = true;
      })
    );
  }

  private reabrirPainel(): void {
    setTimeout(() => {
      if (!this.suspenderPainel) this.trigger?.openPanel();
    }, 0);
  }
}
