import { fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { ProdutoSelectorComponent } from './produto-selector.component';

describe('ProdutoSelectorComponent', () => {
  function criar() {
    const component = new ProdutoSelectorComponent();
    component.control = new FormControl<string | any | null>('');
    component.buscarFn = jasmine.createSpy('buscarFn').and.returnValue(of([{
      id: 10,
      codigo: 'ABC-10',
      nome: 'Produto teste',
    }]));
    component.ngOnInit();
    return component;
  }

  it('busca a primeira página ao abrir o campo vazio', () => {
    const component = criar();

    component.abrirProdutos();

    expect(component.buscarFn).toHaveBeenCalledWith('');
    expect(component.produtos.length).toBe(1);
  });

  it('busca por código após debounce', fakeAsync(() => {
    const component = criar();

    component.control.setValue('ABC-10');
    tick(251);

    expect(component.buscarFn).toHaveBeenCalledWith('ABC-10');
  }));

  it('usa o placeholder comercial por padrão', () => {
    const component = criar();

    expect(component.placeholder).toBe('Digite o código, nome ou clique para escolher');
  });

  it('emite a ação para abrir a lista completa após fechar o painel', fakeAsync(() => {
    const component = criar();
    const verTodos = jasmine.createSpy('verTodos');
    component.verTodosProdutos.subscribe(verTodos);

    component.abrirTodos();
    tick();

    expect(verTodos).toHaveBeenCalled();
  }));

  it('fecha e não reabre o autocomplete ao abrir todos os produtos', fakeAsync(() => {
    const component = criar();
    const trigger = {
      closePanel: jasmine.createSpy('closePanel'),
      openPanel: jasmine.createSpy('openPanel'),
    };
    component.trigger = trigger as any;
    component.abrirProdutos();

    component.abrirTodos();
    tick();

    expect(trigger.closePanel).toHaveBeenCalledTimes(2);
    expect(trigger.openPanel).not.toHaveBeenCalled();
  }));
});
