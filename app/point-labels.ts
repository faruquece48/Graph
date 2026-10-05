type Box = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number; text: string; key: string; series: number };
const overlaps = (a: Box, b: Box) => a.x < b.x+b.width+4 && a.x+a.width+4 > b.x && a.y < b.y+b.height+4 && a.y+a.height+4 > b.y;

export function placePointLabels(points: Point[], fontSize: number, obstacles: Box[]) {
  const occupied = [...obstacles];
  return [...points].sort((a,b) => a.series-b.series || a.x-b.x).map(point => {
    const width = point.text.length*fontSize*.64+6;
    const height = fontSize+4;
    const above = { x: point.x-width/2, y: point.y-10-height, width,height };
    const right = { x: point.x+12, y: point.y-height/2, width,height };
    const below = { x: point.x+12, y: point.y+12, width,height };
    const left = { x: point.x-12-width, y: point.y-height/2, width,height };
    const preferred = point.series === 0 ? [above,left,right,below] : point.series === 1 ? [right,left,above,below] : [below,right,left,above];
    const candidates = preferred.map(box => ({...box,x:Math.max(104,Math.min(896-width,box.x))}));
    // Limit collision adjustments to one text height to keep labels near their points.
    for (const box of [...candidates]) for (const dy of [-height-6,height+6]) candidates.push({...box,y:box.y+dy});
    const box = candidates.find(box => !occupied.some(other => overlaps(box,other))) ?? candidates[0];
    occupied.push(box);
    const connectorX = Math.max(box.x, Math.min(box.x+width, point.x));
    const connectorY = Math.max(box.y, Math.min(box.y+height, point.y));
    const distance = Math.hypot(connectorX-point.x, connectorY-point.y);
    const inset = Math.min(7, distance);
    return { ...point, labelX: box.x+width/2, labelY: box.y+2+fontSize*.8,
      connectorX, connectorY,
      connectorStartX: point.x+(connectorX-point.x)*(distance ? inset/distance : 0),
      connectorStartY: point.y+(connectorY-point.y)*(distance ? inset/distance : 0) };
  });
}
