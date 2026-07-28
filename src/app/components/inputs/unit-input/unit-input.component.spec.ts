import { UnitInputComponent } from './unit-input.component';

describe('UnitInputComponent', () => {
  it('aceita ponto como separador decimal', () => {
    const component = new UnitInputComponent();
    const values: Array<number | null> = [];
    component.registerOnChange((next) => values.push(next));

    component.onInput('5.25');

    expect(values[0]).toBe(5.25);
  });

  it('aceita vírgula como separador decimal', () => {
    const component = new UnitInputComponent();
    const values: Array<number | null> = [];
    component.registerOnChange((next) => values.push(next));

    component.onInput('5,25');

    expect(values[0]).toBe(5.25);
  });
});
