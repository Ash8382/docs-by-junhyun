"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
  ).toUpperCase();
}

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

interface PaletteColor {
  name: string;
  h: number;
  s: number;
  l: number;
}

function generatePalette(h: number, s: number, l: number): PaletteColor[] {
  return [
    { name: "Base", h, s, l },
    { name: "Complementary", h: normalizeHue(h + 180), s, l },
    { name: "Analogous 1", h: normalizeHue(h + 30), s, l },
    { name: "Analogous 2", h: normalizeHue(h - 30), s, l },
    { name: "Triadic", h: normalizeHue(h + 120), s, l },
  ];
}

function ColorSwatch({ color }: { color: PaletteColor }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [r, g, b] = hslToRgb(color.h, color.s, color.l);
  const hex = rgbToHex(r, g, b);
  const rgbStr = `rgb(${r}, ${g}, ${b})`;
  const hslStr = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
  const bgStyle = { backgroundColor: hslStr };

  const copyToClipboard = useCallback(
    (value: string, field: string) => {
      navigator.clipboard.writeText(value).then(() => {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1200);
      });
    },
    []
  );

  const ValueRow = ({
    label,
    value,
    field,
  }: {
    label: string;
    value: string;
    field: string;
  }) => (
    <button
      onClick={() => copyToClipboard(value, field)}
      className="w-full flex items-center justify-between px-3 py-1.5 rounded-md
                 hover:bg-secondary/60 transition-colors text-sm cursor-pointer group"
    >
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="font-mono text-foreground group-hover:text-foreground/80">
        {copiedField === field ? (
          <span className="text-green-400 text-xs">Copied!</span>
        ) : (
          value
        )}
      </span>
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden flex flex-col">
      <div className="w-full aspect-square rounded-t-xl" style={bgStyle} />
      <div className="p-3 space-y-0.5">
        <p className="text-sm font-semibold text-foreground mb-2">{color.name}</p>
        <ValueRow label="HEX" value={hex} field="hex" />
        <ValueRow label="RGB" value={rgbStr} field="rgb" />
        <ValueRow label="HSL" value={hslStr} field="hsl" />
      </div>
    </div>
  );
}

export default function ColorPalettePage() {
  const [hue, setHue] = useState(210);
  const [saturation, setSaturation] = useState(80);
  const [lightness, setLightness] = useState(55);

  const palette = generatePalette(hue, saturation, lightness);

  const sliderTrackClass =
    "w-full h-2 rounded-full appearance-none cursor-pointer " +
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 " +
    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md " +
    "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/50 " +
    "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full " +
    "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/50";

  const hueGradient =
    "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))";

  const satGradient = `linear-gradient(to right, hsl(${hue},0%,${lightness}%), hsl(${hue},100%,${lightness}%))`;

  const litGradient = `linear-gradient(to right, hsl(${hue},${saturation}%,0%), hsl(${hue},${saturation}%,50%), hsl(${hue},${saturation}%,100%))`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          href="/playground"
          className="text-purple-400 hover:text-purple-300 inline-block transition-colors mb-6 text-sm"
        >
          &larr; Back to Playground
        </Link>

        <h1 className="text-3xl font-bold mb-2">Color Palette Generator</h1>
        <p className="text-muted-foreground mb-8">
          Pick a base color with HSL sliders and explore harmonious palettes.
        </p>

        {/* HSL Sliders */}
        <div className="rounded-xl border border-border bg-secondary/30 p-6 mb-10 space-y-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg border border-border shrink-0"
              style={{
                backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
              }}
            />
            <div className="flex-1 space-y-4">
              {/* Hue */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Hue</span>
                  <span className="font-mono">{hue}&deg;</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={hue}
                  onChange={(e) => setHue(Number(e.target.value))}
                  className={sliderTrackClass}
                  style={{ background: hueGradient }}
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Saturation</span>
                  <span className="font-mono">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className={sliderTrackClass}
                  style={{ background: satGradient }}
                />
              </div>

              {/* Lightness */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Lightness</span>
                  <span className="font-mono">{lightness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={lightness}
                  onChange={(e) => setLightness(Number(e.target.value))}
                  className={sliderTrackClass}
                  style={{ background: litGradient }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Palette Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {palette.map((color) => (
            <ColorSwatch key={color.name} color={color} />
          ))}
        </div>
      </div>
    </div>
  );
}
