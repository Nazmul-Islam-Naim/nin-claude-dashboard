import { progress } from '../lib.js'

// Shared by ProjectCard (bar) and detail page (message only). Returns the 006 messages for non-ok states.
export function reqMessage(req) {
  if (req.status === 'no-sheet') return 'Sheet যুক্ত নেই'
  if (req.status === 'error') return 'Sheet পড়া যায়নি'
  if (progress(req).total === 0) return 'কোনো requirement নেই'
  return null
}

export default function ReqSummary({ req }) {
  const msg = reqMessage(req)
  if (msg) return <p className="text-[13px] text-muted">{msg}</p>
  const { done, total } = progress(req)
  return (
    <>
      <div className="h-2 rounded-full bg-indigo-50" role="img" aria-label={`${done}/${total} Spec Written`}>
        <i className="block h-full rounded-full bg-primary" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-muted">{done}/{total} Spec Written</p>
    </>
  )
}
