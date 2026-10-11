import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sin `globals: true`, RTL no desmonta solo lo que renderizó un test: sin esto, el DOM de un test
// se filtra al siguiente.
afterEach(() => {
  cleanup();
});
