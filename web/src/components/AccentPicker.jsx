import { ACCENTS } from '../lib.js'

export default function AccentPicker({ accent, onChange }) {
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex shrink-0 items-center gap-1.5">
      {ACCENTS.map((a) => (
        <button
          key={a.id} type="button" role="radio" aria-checked={accent === a.id} aria-label={a.name} title={a.name}
          onClick={() => onChange(a.id)}
          style={{ background: a.hex }}
          className={`h-5 w-5 rounded-full transition-transform hover:scale-110 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${accent === a.id ? 'ring-2 ring-fg ring-offset-2 ring-offset-white' : ''}`}
        />
      ))}
    </div>
  )
}
