import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Sun, Moon, Languages, Palette, RefreshCw } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Color Converter',
    subtitle: 'Convert between HEX, RGB and HSL. Generate color palettes. Everything runs client-side.',
    inputLabel: 'Color Input',
    inputDesc: 'Enter a HEX, RGB, or HSL color value',
    inputPlaceholder: '#3b82f6 or rgb(59,130,246) or hsl(217,91%,60%)',
    formats: 'Color Formats',
    formatsDesc: 'Converted values in all formats',
    hex: 'HEX',
    rgb: 'RGB',
    hsl: 'HSL',
    preview: 'Preview',
    palettes: 'Color Palettes',
    complementary: 'Complementary',
    analogous: 'Analogous',
    triadic: 'Triadic',
    copy: 'Copy',
    copied: 'Copied!',
    invalidColor: 'Invalid color. Try #ff0000, rgb(255,0,0), or hsl(0,100%,50%)',
    builtBy: 'Built by',
    clickCopy: 'Click any color swatch to copy its HEX value',
  },
  pt: {
    title: 'Conversor de Cores',
    subtitle: 'Converta entre HEX, RGB e HSL. Gere paletas de cores. Tudo roda no navegador.',
    inputLabel: 'Entrada de Cor',
    inputDesc: 'Digite um valor de cor HEX, RGB ou HSL',
    inputPlaceholder: '#3b82f6 ou rgb(59,130,246) ou hsl(217,91%,60%)',
    formats: 'Formatos de Cor',
    formatsDesc: 'Valores convertidos em todos os formatos',
    hex: 'HEX',
    rgb: 'RGB',
    hsl: 'HSL',
    preview: 'Visualizacao',
    palettes: 'Paletas de Cores',
    complementary: 'Complementar',
    analogous: 'Analogas',
    triadic: 'Triadica',
    copy: 'Copiar',
    copied: 'Copiado!',
    invalidColor: 'Cor invalida. Tente #ff0000, rgb(255,0,0) ou hsl(0,100%,50%)',
    builtBy: 'Criado por',
    clickCopy: 'Clique em qualquer amostra para copiar o valor HEX',
  }
} as const
type Lang = keyof typeof translations

// ── Color math ───────────────────────────────────────────────────────────────
interface RGB { r: number; g: number; b: number }
interface HSL { h: number; s: number; l: number }

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return { r, g, b }
  }
  return null
}

function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = ln - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

function parseColor(input: string): RGB | null {
  const s = input.trim().toLowerCase()
  if (s.startsWith('#')) return hexToRgb(s)
  const rgbMatch = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (rgbMatch) return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) }
  const hslMatch = s.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/)
  if (hslMatch) return hslToRgb({ h: parseInt(hslMatch[1]), s: parseInt(hslMatch[2]), l: parseInt(hslMatch[3]) })
  return null
}

function rotateHue(hsl: HSL, degrees: number): HSL {
  return { ...hsl, h: (hsl.h + degrees + 360) % 360 }
}

function getPalettes(rgb: RGB) {
  const hsl = rgbToHsl(rgb)
  const comp = hslToRgb(rotateHue(hsl, 180))
  const ana1 = hslToRgb(rotateHue(hsl, -30))
  const ana2 = hslToRgb(rotateHue(hsl, 30))
  const tri1 = hslToRgb(rotateHue(hsl, 120))
  const tri2 = hslToRgb(rotateHue(hsl, 240))
  return {
    complementary: [rgb, comp],
    analogous: [ana1, rgb, ana2],
    triadic: [rgb, tri1, tri2],
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ColorConverter() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [input, setInput] = useState('#3b82f6')
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')

  const t = translations[lang]
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const rgb = parseColor(input)
  const hsl = rgb ? rgbToHsl(rgb) : null
  const hex = rgb ? rgbToHex(rgb) : null
  const palettes = rgb ? getPalettes(rgb) : null

  const handleInput = useCallback((val: string) => {
    setInput(val)
    setError(val.trim() && !parseColor(val) ? t.invalidColor : '')
  }, [t])

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const CopyBtn = ({ text }: { text: string }) => (
    <button
      onClick={() => copyText(text)}
      className="ml-2 p-1.5 rounded-md text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0"
      title={t.copy}
    >
      {copied === text ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )

  const accentColor = hex || '#3b82f6'

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: accentColor }}>
              <Palette size={18} className="text-white" />
            </div>
            <span className="font-semibold">Color Converter</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/color-converter" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
              <div>
                <h2 className="font-semibold">{t.inputLabel}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.inputDesc}</p>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={hex || '#3b82f6'}
                  onChange={e => handleInput(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={input}
                  onChange={e => handleInput(e.target.value)}
                  placeholder={t.inputPlaceholder}
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                />
                <button
                  onClick={() => handleInput('#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'))}
                  className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Random color"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

              {/* Preview */}
              {rgb && (
                <div>
                  <p className="text-sm font-medium mb-2">{t.preview}</p>
                  <div className="h-24 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-inner transition-colors" style={{ backgroundColor: hex! }} />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[20, 40, 60, 80, 90].map(l => {
                      const shade = rgbToHex(hslToRgb({ h: hsl!.h, s: hsl!.s, l }))
                      return (
                        <div
                          key={l}
                          className="h-8 rounded-md cursor-pointer border border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-105"
                          style={{ backgroundColor: shade }}
                          onClick={() => copyText(shade)}
                          title={shade}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Formats */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
              <div>
                <h2 className="font-semibold">{t.formats}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.formatsDesc}</p>
              </div>
              {rgb && hex && hsl ? (
                <div className="space-y-3">
                  {[
                    { label: t.hex, value: hex.toUpperCase() },
                    { label: t.rgb, value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
                    { label: t.hsl, value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
                    { label: 'RGB Raw', value: `${rgb.r}, ${rgb.g}, ${rgb.b}` },
                    { label: 'CSS var', value: `--color: ${hex};` },
                    { label: 'Tailwind', value: `bg-[${hex}]` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2">
                      <div
                        className="w-4 h-4 rounded-sm mr-3 shrink-0 border border-zinc-300 dark:border-zinc-600"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-xs text-zinc-400 w-20 shrink-0">{label}</span>
                      <span className="font-mono text-sm flex-1 truncate">{value}</span>
                      <CopyBtn text={value} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400 italic">Enter a valid color to see conversions.</p>
              )}
            </div>
          </div>

          {/* Palettes */}
          {palettes && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6">
              <div>
                <h2 className="font-semibold">{t.palettes}</h2>
                <p className="text-xs text-zinc-400 mt-1">{t.clickCopy}</p>
              </div>
              {([
                { label: t.complementary, colors: palettes.complementary },
                { label: t.analogous, colors: palettes.analogous },
                { label: t.triadic, colors: palettes.triadic },
              ] as const).map(({ label, colors }) => (
                <div key={label}>
                  <p className="text-sm font-medium mb-3">{label}</p>
                  <div className="flex gap-3">
                    {(colors as RGB[]).map((c, i) => {
                      const h = rgbToHex(c)
                      return (
                        <div key={i} className="flex-1 space-y-2">
                          <div
                            className="h-16 rounded-xl cursor-pointer border border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-105 hover:shadow-md"
                            style={{ backgroundColor: h }}
                            onClick={() => copyText(h.toUpperCase())}
                            title={`Copy ${h.toUpperCase()}`}
                          />
                          <p className="text-center font-mono text-xs text-zinc-500">{h.toUpperCase()}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
