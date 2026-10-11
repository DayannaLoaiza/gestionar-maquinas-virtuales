interface ChartDataTableProps {
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}

/**
 * Los mismos datos de un gráfico como tabla, solo para lectores de pantalla
 * (RF-resource-dashboard-09). `sr-only` va en un `div`: en una `<table>` no limita el ancho, que
 * crece con el contenido y desborda la página en pantallas angostas.
 */
export function ChartDataTable({ caption, headers, rows }: Readonly<ChartDataTableProps>) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={index}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
