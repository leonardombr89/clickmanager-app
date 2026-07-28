import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { MaterialModule } from 'src/app/material.module';
import { CalculadoraPisoProduto } from 'src/app/pages/apps/calculadoras/pisos/calculadora-pisos.models';

export interface ProdutoSelectorDialogData {
  buscarFn: (termo: string) => Observable<CalculadoraPisoProduto[]>;
}

@Component({
  selector: 'app-produto-selector-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule, InputPesquisaComponent],
  template: `
    <h2 mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>Selecionar produto</strong>
        <span>Busque ou escolha um produto configurado para cálculo.</span>
      </div>
      <button type="button" mat-icon-button aria-label="Fechar" (click)="fechar()">
        <mat-icon>close</mat-icon>
      </button>
    </h2>

    <mat-dialog-content class="dialog-content">
      <app-input-pesquisa
        [showLabel]="false"
        placeholder="Código, nome, SKU, código de barras ou marca"
        (valorAlterado)="buscar($event)">
      </app-input-pesquisa>

      <div class="dialog-loading" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
        <span>Buscando produtos...</span>
      </div>

      <div class="produto-list" *ngIf="!loading && produtos.length">
        <button type="button" *ngFor="let produto of produtos" (click)="selecionar(produto)">
          <div>
            <strong>{{ produto.nome }}</strong>
            <span>{{ produto.codigo || 'Sem código' }} · {{ produto.marca || 'Sem marca' }}</span>
          </div>
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <div class="empty-state" *ngIf="!loading && !produtos.length">
        Nenhum produto configurado encontrado.
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="fechar()">Fechar</button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../dialog/dialog-form-shell.scss'],
  styles: [`
    mat-dialog-content { min-height: 320px; }
    .dialog-loading, .empty-state { display: flex; gap: 10px; align-items: center; padding: 24px 4px; color: #667085; }
    .produto-list { display: grid; border-top: 1px solid #e5eaef; }
    .produto-list button {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      width: 100%;
      border: 0;
      border-bottom: 1px solid #e5eaef;
      padding: 12px 4px;
      background: #fff;
      text-align: left;
      cursor: pointer;
    }
    .produto-list button:hover { background: #f8fafc; }
    .produto-list button > div { display: grid; gap: 2px; min-width: 0; }
    .produto-list span { color: #667085; font-size: 13px; }
  `],
})
export class ProdutoSelectorDialogComponent implements OnInit {
  produtos: CalculadoraPisoProduto[] = [];
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) private readonly data: ProdutoSelectorDialogData,
    private readonly dialogRef: MatDialogRef<ProdutoSelectorDialogComponent>
  ) {}

  ngOnInit(): void {
    this.buscar('');
  }

  buscar(termo: string): void {
    this.loading = true;
    this.data.buscarFn(termo || '').pipe(
      catchError(() => of([])),
      finalize(() => (this.loading = false))
    ).subscribe((produtos) => (this.produtos = produtos));
  }

  selecionar(produto: CalculadoraPisoProduto): void {
    this.dialogRef.close(produto);
  }

  fechar(): void {
    this.dialogRef.close(null);
  }
}
