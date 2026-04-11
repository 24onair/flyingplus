export type TaskCircle = {
  lat: number;
  lng: number;
  radiusM: number;
};

type SamplePoint = {
  lng: number;
  lat: number;
  x: number;
  y: number;
};

function toXY(lat: number, lng: number, lat0: number) {
  const metersPerLat = 111320;
  const metersPerLng = Math.cos((lat0 * Math.PI) / 180) * 111320;

  return {
    x: lng * metersPerLng,
    y: lat * metersPerLat,
  };
}

function toLatLng(x: number, y: number, lat0: number) {
  const metersPerLat = 111320;
  const metersPerLng = Math.cos((lat0 * Math.PI) / 180) * 111320;

  return {
    lng: x / metersPerLng,
    lat: y / metersPerLat,
  };
}

export function buildCircleCoordinates(
  lat: number,
  lng: number,
  radiusM: number,
  steps = 48
) {
  const lat0 = lat;
  const center = toXY(lat, lng, lat0);
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps;
    const x = center.x + Math.cos(angle) * radiusM;
    const y = center.y + Math.sin(angle) * radiusM;
    const point = toLatLng(x, y, lat0);
    coordinates.push([point.lng, point.lat]);
  }

  return coordinates;
}

function sampleCircleBoundary(circle: TaskCircle, lat0: number, sampleCount: number) {
  const center = toXY(circle.lat, circle.lng, lat0);
  const samples: SamplePoint[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const angle = (Math.PI * 2 * index) / sampleCount;
    const x = center.x + Math.cos(angle) * circle.radiusM;
    const y = center.y + Math.sin(angle) * circle.radiusM;
    const point = toLatLng(x, y, lat0);
    samples.push({
      lng: point.lng,
      lat: point.lat,
      x,
      y,
    });
  }

  return samples;
}

function distanceMeters(from: SamplePoint, to: SamplePoint) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function computeTaskPath(circles: TaskCircle[], sampleCount = 72) {
  if (circles.length < 2) {
    return {
      distanceKm: 0,
      boundaryPoints: circles.map((circle) => ({
        lng: circle.lng,
        lat: circle.lat,
      })),
      segments: [] as [number, number][][],
    };
  }

  const lat0 =
    circles.reduce((total, circle) => total + circle.lat, 0) / circles.length;
  const samplesPerCircle = circles.map((circle) =>
    sampleCircleBoundary(circle, lat0, sampleCount)
  );

  let previousCosts = new Array(sampleCount).fill(0);
  const parents: number[][] = [];

  for (let circleIndex = 1; circleIndex < samplesPerCircle.length; circleIndex += 1) {
    const currentSamples = samplesPerCircle[circleIndex];
    const previousSamples = samplesPerCircle[circleIndex - 1];
    const currentCosts = new Array(sampleCount).fill(Number.POSITIVE_INFINITY);
    const currentParents = new Array(sampleCount).fill(0);

    for (let currentIndex = 0; currentIndex < currentSamples.length; currentIndex += 1) {
      for (let previousIndex = 0; previousIndex < previousSamples.length; previousIndex += 1) {
        const candidateCost =
          previousCosts[previousIndex] +
          distanceMeters(previousSamples[previousIndex], currentSamples[currentIndex]);

        if (candidateCost < currentCosts[currentIndex]) {
          currentCosts[currentIndex] = candidateCost;
          currentParents[currentIndex] = previousIndex;
        }
      }
    }

    parents.push(currentParents);
    previousCosts = currentCosts;
  }

  let bestLastIndex = 0;
  for (let index = 1; index < previousCosts.length; index += 1) {
    if (previousCosts[index] < previousCosts[bestLastIndex]) {
      bestLastIndex = index;
    }
  }

  const chosenIndices = new Array(samplesPerCircle.length).fill(0);
  chosenIndices[chosenIndices.length - 1] = bestLastIndex;

  for (let parentIndex = parents.length - 1; parentIndex >= 0; parentIndex -= 1) {
    chosenIndices[parentIndex] =
      parents[parentIndex][chosenIndices[parentIndex + 1]];
  }

  const boundaryPoints = chosenIndices.map((sampleIndex, circleIndex) => {
    const point = samplesPerCircle[circleIndex][sampleIndex];
    return {
      lng: point.lng,
      lat: point.lat,
    };
  });

  const segments = boundaryPoints.slice(1).map((point, index) => [
    [boundaryPoints[index].lng, boundaryPoints[index].lat],
    [point.lng, point.lat],
  ]);

  return {
    distanceKm: previousCosts[bestLastIndex] / 1000,
    boundaryPoints,
    segments,
  };
}
