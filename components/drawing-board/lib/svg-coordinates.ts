const toSvgCoordinates = (
  e: Pick<React.MouseEvent, "clientX" | "clientY">,
  svgRef: SVGSVGElement | null
): { x: number; y: number } => {
  if (!svgRef) return { x: 0, y: 0 };
  const pt = svgRef.createSVGPoint();

  pt.x = e.clientX;
  pt.y = e.clientY;

  const svgP = pt.matrixTransform(svgRef.getScreenCTM()?.inverse());

  return { x: svgP.x, y: svgP.y };
};

const fromSvgCoordinates = (
  position: { x: number; y: number },
  svgRef: SVGSVGElement | null
): Pick<React.MouseEvent, "clientX" | "clientY"> => {
  if (!svgRef) return { clientX: 0, clientY: 0 };

  const point = svgRef.createSVGPoint();

  point.x = position.x;
  point.y = position.y;

  const gp = point.matrixTransform(svgRef.getScreenCTM() ?? undefined);

  return { clientX: gp.x, clientY: gp.y };
};

export { toSvgCoordinates, fromSvgCoordinates };
