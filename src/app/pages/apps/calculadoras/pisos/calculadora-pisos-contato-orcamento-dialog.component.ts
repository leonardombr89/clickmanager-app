import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InputTelefoneComponent } from 'src/app/components/inputs/input-telefone/input-telefone.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { MaterialModule } from 'src/app/material.module';

export interface CalculadoraPisosContatoOrcamento {
  nomeContato: string;
  telefoneContato: string;
}

@Component({
  selector: 'app-calculadora-pisos-contato-orcamento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MaterialModule,
    InputTextoRestritoComponent,
    InputTelefoneComponent,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>Criar orçamento</strong>
        <span>Informe os dados de contato para criar o orçamento.</span>
      </div>
      <button type="button" mat-icon-button aria-label="Fechar" (click)="cancelar()">
        <mat-icon>close</mat-icon>
      </button>
    </h2>

    <mat-dialog-content class="dialog-content">
      <div [formGroup]="form" class="dialog-form">
        <app-input-texto-restrito
          [control]="nomeControl"
          label="Nome do cliente"
          placeholder="Informe o nome"
          [maxlength]="160">
        </app-input-texto-restrito>

        <app-input-telefone
          [control]="telefoneControl"
          label="Telefone"
          placeholder="(00) 00000-0000">
        </app-input-telefone>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="confirmar()" [disabled]="form.invalid">
        Criar orçamento
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss'],
  styles: [`
    .dialog-form {
      display: grid;
      gap: 12px;
      width: 100%;
      padding-top: 4px;
    }
  `],
})
export class CalculadoraPisosContatoOrcamentoDialogComponent {
  readonly form = this.fb.group({
    nomeContato: ['', [Validators.required, Validators.maxLength(160)]],
    telefoneContato: ['', [Validators.required]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CalculadoraPisosContatoOrcamentoDialogComponent>
  ) {}

  get nomeControl(): FormControl {
    return this.form.controls.nomeContato as FormControl;
  }

  get telefoneControl(): FormControl {
    return this.form.controls.telefoneContato as FormControl;
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      nomeContato: raw.nomeContato?.trim() || '',
      telefoneContato: (raw.telefoneContato || '').replace(/\D/g, ''),
    } satisfies CalculadoraPisosContatoOrcamento);
  }
}
