import {
  buildPaginationMeta,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePagination,
} from './pagination.util';

describe('normalizePagination', () => {
  it('usa los defaults si no llegan valores', () => {
    expect(normalizePagination()).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it.each([
    ['0', 1],
    ['-3', 1],
    ['abc', 1],
    ['2abc', 2],
  ])('page %p se lee como %p', (raw, expected) => {
    expect(normalizePagination(raw).page).toBe(expected);
  });

  it('recorta pageSize al máximo', () => {
    expect(normalizePagination('1', '5000').pageSize).toBe(MAX_PAGE_SIZE);
  });
});

describe('buildPaginationMeta', () => {
  it('calcula páginas y navegación', () => {
    expect(buildPaginationMeta({ page: 2, pageSize: 10 }, 25)).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('sin elementos no hay páginas siguientes', () => {
    expect(buildPaginationMeta({ page: 1, pageSize: 10 }, 0)).toMatchObject({
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });
});
