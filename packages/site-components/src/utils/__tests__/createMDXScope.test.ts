import { createMDXScope } from '../createMDXScope';

describe('GIVEN createMDXScope', () => {
  test("should add meta to it's scope", () => {
    const scope = createMDXScope({ test: 'TEST META' });
    expect(scope.meta).toEqual({ test: 'TEST META' });
  });
  test('should provide a filter helper which filters by callback', () => {
    const scope = createMDXScope();
    const filter = scope.helpers.filter({ filter: item => item.product === 'PRODUCT_C' });
    const filteredView = filter([
      { product: 'PRODUCT_A' },
      { product: 'PRODUCT_B' },
      { product: 'PRODUCT_C' }
    ]);
    expect(filteredView).toEqual([{ product: 'PRODUCT_C' }]);
  });
  test('should provide a limit helper which limits the displayed results', () => {
    const scope = createMDXScope();
    const limit = scope.helpers.limit({ max: 2 });
    const filteredView = limit([
      { product: 'PRODUCT_A' },
      { product: 'PRODUCT_B' },
      { product: 'PRODUCT_C' }
    ]);
    expect(filteredView).toEqual([{ product: 'PRODUCT_A' }, { product: 'PRODUCT_B' }]);
  });
  test('should provide a sort helper which can sort the results by date key', () => {
    const scope = createMDXScope();
    const sort = scope.helpers.sortViewByDate({ dateKey: 'releaseDate' });
    const filteredView = sort([
      { product: 'PRODUCT_A', releaseDate: '2020/01/01' },
      { product: 'PRODUCT_B', releaseDate: '2020/01/02' },
      { product: 'PRODUCT_C', releaseDate: '2020/01/03' }
    ]);
    expect(filteredView[0].product).toEqual('PRODUCT_C');
    expect(filteredView[1].product).toEqual('PRODUCT_B');
    expect(filteredView[2].product).toEqual('PRODUCT_A');
  });
  test('should provide a sort helper which can sort the results by date function', () => {
    const scope = createMDXScope();
    const sort = scope.helpers.sortViewByDate({ dateKey: item => item.releaseDate });
    const filteredView = sort([
      { product: 'PRODUCT_A', releaseDate: '2020/01/01' },
      { product: 'PRODUCT_B', releaseDate: '2020/01/02' },
      { product: 'PRODUCT_C', releaseDate: '2020/01/03' }
    ]);
    expect(filteredView[0].product).toEqual('PRODUCT_C');
    expect(filteredView[1].product).toEqual('PRODUCT_B');
    expect(filteredView[2].product).toEqual('PRODUCT_A');
  });
  test('should provide a flow function which enables you to compose helpers', () => {
    const scope = createMDXScope();
    const sort = scope.helpers.flow([
      scope.helpers.sortViewByDate({ dateKey: item => item.releaseDate }),
      scope.helpers.filter({ filter: item => item.product === 'PRODUCT_A' }),
      scope.helpers.limit({ max: 3 })
    ]);
    const filteredView = sort([
      { product: 'PRODUCT_C', releaseDate: '2022/01/01' },
      { product: 'PRODUCT_A', releaseDate: '2020/01/02' },
      { product: 'PRODUCT_A', releaseDate: '2020/01/04' },
      { product: 'PRODUCT_A', releaseDate: '2020/01/05' },
      { product: 'PRODUCT_A', releaseDate: '2020/01/04' }
    ]);
    expect(filteredView.length).toEqual(3);
    expect(filteredView[0]).toEqual({ product: 'PRODUCT_A', releaseDate: '2020/01/05' });
    expect(filteredView[1]).toEqual({ product: 'PRODUCT_A', releaseDate: '2020/01/04' });
    expect(filteredView[2]).toEqual({ product: 'PRODUCT_A', releaseDate: '2020/01/04' });
  });
  test('should provide a collection of hooks', () => {
    const scope = createMDXScope();
    expect(scope.hooks).toBeDefined();
  });
  test('should provide a collection of recipes', () => {
    const scope = createMDXScope();
    expect(scope.recipes).toBeDefined();
  });
});
