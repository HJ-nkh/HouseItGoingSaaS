import classNames from "classnames";

type URMatrixProps = {
  rowNames: string[];
  colNames: string[];
  // Allow matrix or individual cells to be null
  matrix: (number | null)[][] | null;
};

const URMatrix: React.FC<URMatrixProps> = ({ rowNames, colNames, matrix }) => {
  // Collect numeric values only (ignore nulls) for scaling
  const numericValues = (matrix ?? [])
    .flat()
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const maxVal = numericValues.length ? Math.max(...numericValues) : 1;

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th></th>
            {colNames.map((colName, index) => (
              <th className="text-sm relative" key={`col-${index}`}>
                <div className="absolute -top-6 left-8">
                  <div className="whitespace-nowrap origin-bottom-left transform -rotate-45">
                    {colName}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(matrix ?? []).map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              <th className="text-sm text-right pr-2">{rowNames[rowIndex]}</th>
              {row.map((val, cellIndex) => {
                const isNull = val == null || Number.isNaN(val);
                const percentage = !isNull ? (val as number) * 100 : null;
                const showWarning = !isNull && (val as number) > 1;
                return (
                  <td
                    className={classNames(
                      "relative border border-solid border-gray-400 px-4 py-2 text-center bg-white"
                    )}
                    key={`cell-${cellIndex}`}
                  >
                    <div className="relative z-20">
                      {isNull ? '-' : `${percentage!.toFixed(1)} %`}
                    </div>
                    {!isNull && (
                      <div
                        className={classNames(
                          "w-full h-full absolute top-0 left-0",
                          { "bg-red-500": showWarning, "bg-indigo-400": !showWarning }
                        )}
                        style={{ opacity: showWarning ? 0.8 : (val as number) / maxVal }}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {(!matrix || matrix.length === 0) && (
        <div className="mt-2 text-sm text-gray-600 italic">Ingen data</div>
      )}
    </div>
  );
};

export default URMatrix;
