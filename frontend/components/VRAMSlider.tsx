'use client';

interface VRAMSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function VRAMSlider({ value, onChange }: VRAMSliderProps) {
  const vramValues = [16, 24, 48, 80, 140, 192, 282, 360, 423, 540, 640, 720, 864, 960, 1080, 1152, 1344, 1536];

  return (
    <div className="mb-8">
      <h3 className="text-sm font-medium mb-4">Filter GPUs by VRAM</h3>
      <div className="relative">
        <input
          type="range"
          min="0"
          max={vramValues.length - 1}
          value={vramValues.indexOf(value)}
          onChange={(e) => onChange(vramValues[parseInt(e.target.value)])}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${(vramValues.indexOf(value) / (vramValues.length - 1)) * 100}%, #374151 ${(vramValues.indexOf(value) / (vramValues.length - 1)) * 100}%, #374151 100%)`
          }}
        />
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Any 16</span>
          <span>24</span>
          <span>48</span>
          <span>80</span>
          <span>140</span>
          <span>192</span>
          <span>282</span>
          <span>360</span>
          <span>423</span>
          <span>540</span>
          <span>640</span>
          <span>720</span>
          <span>864</span>
          <span>960</span>
          <span>1080</span>
          <span>1152</span>
          <span>1344</span>
          <span>1536</span>
        </div>
      </div>
    </div>
  );
}
