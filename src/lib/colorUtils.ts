// Utility to generate a 50-950 color palette from a single hex color
export function generatePalette(hex: string): Record<string, string> {
  const baseRgb = hexToRgb(hex);
  if (!baseRgb) return {};

  const palette: Record<string, string> = {};
  
  // Tailwind default weights
  const weights = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  
  weights.forEach(weight => {
    if (weight === 500) {
      palette[weight] = hex;
    } else if (weight < 500) {
      // Mix with white
      const mixPercentage = (500 - weight) / 500; // e.g., 50 -> 0.9, 100 -> 0.8
      // Adjusted mix percentage to make 50 very light
      const adjustedMix = mixPercentage === 0.9 ? 0.95 : mixPercentage;
      palette[weight] = rgbToHex(mixColors([255, 255, 255], baseRgb, adjustedMix));
    } else {
      // Mix with black
      const mixPercentage = (weight - 500) / 500; // e.g., 900 -> 0.8
      // Adjusted mix to make 950 very dark
      const adjustedMix = weight === 950 ? 0.9 : mixPercentage;
      palette[weight] = rgbToHex(mixColors([0, 0, 0], baseRgb, adjustedMix));
    }
  });

  return palette;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

// Mix two rgb arrays by a given weight (0 to 1) towards color1
function mixColors(color1: [number, number, number], color2: [number, number, number], weight: number): [number, number, number] {
  const w = Math.min(Math.max(weight, 0), 1);
  const w2 = 1 - w;
  return [
    Math.round(color1[0] * w + color2[0] * w2),
    Math.round(color1[1] * w + color2[1] * w2),
    Math.round(color1[2] * w + color2[2] * w2)
  ];
}
