import classNames from "classnames";

type URMatrixProps = {
  rowNames: string[];
  colNames: string[];
  matrix: number[][];
};

const URMatrix: React.FC<URMatrixProps> = ({ rowNames, colNames, matrix }) => {
  const maxVal = Math.max(...matrix.flat());

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
          {matrix.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              <th className="text-sm text-right pr-2">{rowNames[rowIndex]}</th>
              {row.map((val, cellIndex) => (
                <td
                  className={classNames(
                    "relative border border-solid border-gray-400 px-4 py-2 text-center bg-white"
                  )}
                  key={`cell-${cellIndex}`}
                >
                  <div className="relative z-20">{(val*100).toFixed(1)}{' %'}</div>
                  <div
                    className={classNames(
                      "w-full h-full absolute top-0 left-0",
                      { "bg-red-500": val > 1, "bg-indigo-400": val <= 1 }
                    )}
                    style={{ opacity: val > 1 ? 0.8 : val / maxVal }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default URMatrix;
