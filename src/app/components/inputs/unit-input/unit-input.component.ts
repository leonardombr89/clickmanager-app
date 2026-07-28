import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-unit-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="w-100">
      <mat-label class="f-s-14 f-w-600 m-b-8 d-block" *ngIf="label">
        {{ label }} <span *ngIf="required" class="required-mark">*</span>
      </mat-label>
      <mat-form-field appearance="outline" class="w-100">
        <input
          matInput
          type="text"
          inputmode="decimal"
          [name]="name"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [ngModel]="displayValue"
          (ngModelChange)="onInput($event)"
          (blur)="onBlur()" />
        <span matSuffix class="unit-suffix" *ngIf="unit">{{ unit }}</span>
        <mat-error *ngIf="requiredError">Campo obrigatório</mat-error>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .required-mark { color: #e5484d; }
    .unit-suffix { color: #667085; padding-right: 4px; }
  `],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => UnitInputComponent),
    multi: true,
  }],
})
export class UnitInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() unit: 'm' | 'm²' | '%' | 'un' | 'caixa' | 'kg' | 'L' | string = '';
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() decimals = 2;
  @Input() requiredError = false;
  @Input() required = false;
  @Input() name = '';

  displayValue = '';
  disabled = false;

  private value: number | null = null;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this.value = this.normalize(value);
    this.displayValue = this.value == null ? '' : this.format(this.value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(raw: string): void {
    this.displayValue = raw;
    this.value = this.normalize(this.parse(raw));
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
    this.displayValue = this.value == null ? '' : this.format(this.value);
  }

  private parse(raw: string): number | null {
    const cleaned = String(raw ?? '').trim().replace(/[^\d,.-]/g, '');
    if (!cleaned) return null;
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const decimalIndex = Math.max(lastComma, lastDot);
    const integerPart = decimalIndex >= 0 ? cleaned.slice(0, decimalIndex) : cleaned;
    const decimalPart = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1) : '';
    const sign = cleaned.startsWith('-') ? '-' : '';
    const normalizedInteger = integerPart.replace(/[^\d]/g, '') || '0';
    const normalized = `${sign}${normalizedInteger}${decimalIndex >= 0 ? `.${decimalPart.replace(/\D/g, '')}` : ''}`;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  private normalize(value: number | null | undefined): number | null {
    if (value == null || !Number.isFinite(value)) return null;
    let next = value;
    if (this.min != null) next = Math.max(this.min, next);
    if (this.max != null) next = Math.min(this.max, next);
    return next;
  }

  private format(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: this.decimals,
    });
  }
}
