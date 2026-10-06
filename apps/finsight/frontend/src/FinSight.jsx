import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { api } from './api/client'
import TransactionWorkspace from './App'
import './styles/FinSight.css'

const NAV = [
  ['dashboard', 'Dashboard', 'grid'], ['invoices', 'Invoice Explorer', 'file'],
  ['review', 'Priority Review Queue', 'shield'],
  ['exceptions', 'Exceptions & Rules', 'alert'], ['analytics', 'AP Analytics', 'chart'],
  ['bi', 'BI Data Studio', 'database'], ['audit', 'Audit Trail', 'history'],
  ['transactions', 'Transaction Risk & SHAP', 'shield'],
]
const LABELS = {
  MISSING_PO: 'Missing purchase order', MISSING_TAX_ID: 'Missing supplier tax ID',
  WATCHLIST_MATCH: 'Supplier watchlist match', DEPARTMENT_LIMIT: 'Department authorization cap',
  EXACT_DUPLICATE: 'Exact duplicate invoice', NEAR_DUPLICATE: 'TF-IDF near-duplicate collision',
  AMOUNT_ANOMALY: 'Historical amount anomaly',
  INSUFFICIENT_HISTORY: 'Supplier history needed', ML_AMOUNT_OUTLIER: 'Second-stage ML outlier',
}
const TITLES = {
  dashboard: 'Accounts Payable Surveillance', invoices: 'Accounts Payable Invoices',
  review: 'Priority Review & Monitoring',
  exceptions: 'Exceptions & Rule Surveillance Queue', analytics: 'AP Exception Analytics & BI',
  bi: 'BI Data Studio', audit: 'AP Compliance & Audit Ledger', transactions: 'MerchantShield Transaction Risk',
}
const COLORS = ['#111827', '#294acb', '#475569', '#7c8ba5', '#a7b0c0', '#d7dce5']
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
const pct = (value) => `${Math.round(value * 100)}%`

function Icon({ name, size = 18 }) {
  const shapes = {
    shield: <><path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m8 12 3 3 5-6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    file: <path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h5"/>,
    alert: <><path d="m12 3 10 18H2zM12 9v5"/><path d="M12 17h.01"/></>,
    chart: <path d="M3 3v18h18M7 17v-5M12 17V7M17 17v-8"/>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/></>,
    history: <path d="M3 11a9 9 0 1 1 2 7M3 3v8h8M12 7v6l4 2"/>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8M1 12h3M20 12h3"/></>,
    upload: <path d="M7 17H5a4 4 0 0 1-1-8 8 8 0 0 1 15-1 5 5 0 0 1 0 10h-2M12 21V11m-4 4 4-4 4 4"/>,
    search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
    refresh: <path d="M20 7a9 9 0 0 0-16 0M4 17a9 9 0 0 0 16 0M20 2v5h-5M4 22v-5h5"/>,
    download: <path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>, filter: <path d="M3 4h18l-7 8v6l-4 2v-8z"/>,
    chevron: <path d="m8 5 7 7-7 7"/>, menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name] || shapes.file}</svg>
}

function Brand({ large = false }) {
  return <div className={`fs-brand ${large ? 'large' : ''}`}>
    <span className="fs-logo"><Icon name="shield" size={large ? 30 : 23}/></span>
    <div><strong>FinSight <small>AP AI</small></strong><span>{large ? 'Microsoft Innovate · Enterprise workspace' : 'Exception Intelligence'}</span></div>
  </div>
}

function Modal({ children, title, onClose, drawer = false }) {
  const dialog = useRef(null)
  useEffect(() => {
    const node = dialog.current
    node.showModal()
    return () => node.close()
  }, [])
  return <dialog ref={dialog} className={`fs-dialog ${drawer ? 'drawer' : ''}`} aria-label={title}
    onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="fs-dialog-head"><h2>{title}</h2><button className="fs-icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{children}</motion.div>
  </dialog>
}

function download(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Badge({ value }) { return <span className={`fs-badge ${value.toLowerCase()}`}>{value.replaceAll('_', ' ')}</span> }

function InvoiceTable({ items, onOpen, compact = false }) {
  return <div className="fs-table-scroll"><table className="fs-table">
    <thead><tr><th>Invoice #</th><th>Supplier</th><th>Amount</th><th>{compact ? 'Triggered rule' : 'Department / Date'}</th><th>Severity</th><th>{compact ? 'Explainability summary (why?)' : 'Status'}</th><th>Action</th></tr></thead>
    <tbody>{items.map((item) => <tr key={item.invoice.id}>
      <td><strong className="fs-mono">{item.invoice.invoice_number}</strong><small>{item.invoice.po_number || 'No purchase order'}</small></td>
      <td><strong>{item.invoice.supplier}</strong><small>{item.invoice.department}</small></td>
      <td className="fs-amount">{money(item.invoice.amount, item.invoice.currency)}</td>
      <td>{compact ? LABELS[item.signals[0]?.code] || 'No rule triggered' : <>{item.invoice.department}<small>{item.invoice.date}</small></>}</td>
      <td><Badge value={item.severity}/><small>{item.queue?.tier?.replaceAll('_', ' ')}</small></td>
      <td>{compact ? <span className="fs-reason" title={item.signals.map((signal) => signal.reason).join(' ')}>{item.signals[0]?.reason || 'No exceptions detected.'}</span> : <Badge value={item.status}/>}</td>
      <td><button className="fs-small-button" onClick={() => onOpen(item)}>{compact ? 'Investigate' : 'View'}</button></td>
    </tr>)}</tbody>
  </table>{items.length === 0 && <div className="fs-empty">No invoices match these filters.</div>}</div>
}

function Trend({ items }) {
  const last = items.map((item) => item.invoice.date).sort().at(-1) || new Date().toISOString().slice(0, 10)
  const counts = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${last}T12:00:00Z`)
    day.setUTCDate(day.getUTCDate() - 6 + index)
    const date = day.toISOString().slice(0, 10)
    const rows = items.filter((item) => item.invoice.date === date)
    return { date, total: rows.length, high: rows.filter((item) => item.severity === 'HIGH').length, critical: rows.filter((item) => item.severity === 'CRITICAL').length }
  })
  const max = Math.max(4, ...counts.map((day) => day.total))
  const line = (key) => counts.map((day, index) => `${44 + index * 96},${225 - day[key] / max * 180}`).join(' ')
  return <div className="fs-trend">
    <div className="fs-legend"><span><i style={{ background: '#bf1854' }}/>Critical</span><span><i style={{ background: '#111827' }}/>High / duplicates</span><span><i style={{ background: '#8792a3' }}/>All invoices</span><small>7 DAYS</small></div>
    <svg viewBox="0 0 670 275" role="img" aria-label="Daily invoice and exception counts in the analyzed batch">
      <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8a93a3" stopOpacity=".26"/><stop offset="100%" stopColor="#8a93a3" stopOpacity=".03"/></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((tick) => <g key={tick}><line x1="44" y1={225 - tick * 45} x2="620" y2={225 - tick * 45} stroke="#e8ecf2" strokeDasharray="3 4"/><text x="15" y={230 - tick * 45} fill="#8290a2" fontSize="12">{Math.round(max * tick / 4)}</text></g>)}
      <polygon points={`44,225 ${line('total')} 620,225`} fill="url(#trendFill)"/>
      <polyline points={line('total')} fill="none" stroke="#8792a3" strokeWidth="2"/>
      <polyline points={line('high')} fill="none" stroke="#111827" strokeWidth="2.5"/>
      <polyline points={line('critical')} fill="none" stroke="#bf1854" strokeWidth="2.5"/>
      {counts.map((day, index) => <g key={day.date}><circle cx={44 + index * 96} cy={225 - day.total / max * 180} r="3" fill="#8792a3"><title>{day.date}: {day.total} invoices, {day.high} high, {day.critical} critical</title></circle><text x={44 + index * 96} y="255" textAnchor="middle" fill="#8290a2" fontSize="12">{day.date.slice(5)}</text></g>)}
    </svg><p className="fs-chart-note">Current batch only. Hover a point for daily counts.</p>
  </div>
}

function DepartmentChart({ items }) {
  const groups = Object.entries(items.filter((item) => item.review_required).reduce((acc, item) => {
    const key = item.invoice.department; acc[key] = (acc[key] || 0) + 1; return acc
  }, {})).sort((a, b) => b[1] - a[1])
  const total = groups.reduce((sum, group) => sum + group[1], 0)
  let offset = 0
  const segments = groups.map((group, index) => { const start = offset; offset += group[1] / total * 100; return `${COLORS[index % COLORS.length]} ${start}% ${offset}%` }).join(',')
  return <><div className="fs-donut" style={{ background: total ? `conic-gradient(${segments})` : '#e8ecf2' }} role="img" aria-label={`${total} flagged invoices by department`}><div><small>FLAGGED</small><strong>{total}</strong></div></div>
    <ul className="fs-dept-list">{groups.map(([name, count], index) => <li key={name}><span><i style={{ background: COLORS[index % COLORS.length] }}/>{name}</span><strong>{count} <small>({pct(count / total)})</small></strong></li>)}</ul>
    {!total && <p className="fs-empty">No flagged departments.</p>}
  </>
}

function RuleChart({ items }) {
  const groups = Object.entries(items.flatMap((item) => item.signals).reduce((acc, signal) => {
    acc[signal.code] = (acc[signal.code] || 0) + 1; return acc
  }, {})).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...groups.map((group) => group[1]))
  return <div className="fs-rule-chart">{groups.map(([rule, count]) => <div key={rule}><span>{LABELS[rule]}</span><div><i style={{ width: `${count / max * 100}%` }}/></div><strong>{count}</strong></div>)}
    {!groups.length && <p className="fs-empty">No rule triggers in this batch.</p>}<p className="fs-chart-note">An invoice may trigger more than one rule.</p>
  </div>
}

function Panel({ title, subtitle, children, action }) {
  return <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="fs-panel"><div className="fs-panel-heading inline"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>{children}</motion.section>
}

function Investigation({ item, onClose, onHandoff }) {
  const [note, setNote] = useState('')
  const invoice = item.invoice
  const matched = item.match?.matched_invoice
  const next = matched ? 'Compare original documents, purchase orders and payment status before treating this as duplicate billing.' : item.signals.some((signal) => signal.code === 'WATCHLIST_MATCH') ? 'Verify the supplied watchlist source and supplier identity with Compliance.' : 'Check the purchase order, contracted amount and supplier history with the department owner.'
  return <Modal title={`Exception Investigation: ${invoice.invoice_number}`} onClose={onClose}>
    <p className="fs-subtitle">Explainable rule breakdown & review handoff</p>
    <div className="fs-investigation-banner"><Icon name="alert" size={28}/><div><strong>{invoice.invoice_number} <Badge value={item.severity}/></strong><small>{invoice.supplier} · {invoice.department}</small></div><div className="fs-investigation-amount"><small>INVOICE AMOUNT</small><strong>{money(invoice.amount, invoice.currency)}</strong></div></div>
    <section className="fs-evidence-section"><h3><span>1</span>What happened?</h3><p>{item.signals.length ? item.signals.map((signal) => signal.reason).join(' ') : 'No review triggers under the supplied policy and history.'}</p></section>
    <section className="fs-evidence-section warm"><h3><span>2</span>Why did it happen?</h3>
      <div className="fs-evidence-grid">{item.signals.map((signal) => <article key={signal.code}><strong>{LABELS[signal.code]}</strong><code>{signal.code}</code><p>{signal.reason}</p></article>)}</div>
      <div className="fs-model-context"><strong>Triage score: {item.risk_score}/100</strong><span>Priority signal; not a fraud probability.</span><span>Prior supplier records: {item.anomaly.prior_count}</span>
        <span>Pipeline: {item.pipeline?.route} · {item.pipeline?.ml_executed ? 'ML executed' : 'ML skipped'}</span><span>{item.pipeline?.reason}</span>
        <strong>{item.queue?.tier?.replaceAll('_', ' ')} · Priority index {item.priority?.index ?? 'needs currency rate'}</strong><span>{item.priority?.formula}</span><span>{item.priority?.interpretation}</span>
        {item.anomaly.median_amount !== null && <span>Historical median: {money(item.anomaly.median_amount, invoice.currency)} · current amount is {item.anomaly.amount_ratio}× median</span>}
        <span>Method: {item.anomaly.method.replaceAll('_', ' ')}</span>
        {item.anomaly.isolation_outlier !== null && <span>Isolation Forest: {item.anomaly.isolation_outlier ? 'outside usual historical amount range' : 'within learned historical range'}; decision {item.anomaly.isolation_decision}</span>}
      </div>
    </section>
    {matched && <section className="fs-evidence-section"><h3><span>3</span>Duplicate evidence · {pct(item.match.similarity)} weighted similarity</h3>
      <div className="fs-comparison">{[invoice, matched].map((record, index) => <article key={record.id}><small>{index === 0 ? 'INCOMING INVOICE' : 'MATCHED REFERENCE'}</small><h4>{record.invoice_number}</h4>
        <dl><dt>Supplier</dt><dd>{record.supplier}</dd><dt>Amount</dt><dd>{money(record.amount, record.currency)}</dd><dt>Date</dt><dd>{record.date}</dd><dt>Purchase order</dt><dd>{record.po_number || 'Missing'}</dd><dt>Description</dt><dd>{record.description}</dd></dl>
      </article>)}</div>
      <div className="fs-match-metrics"><span>Number similarity<strong>{pct(item.match.components.invoice_number)}</strong></span><span>Description TF-IDF<strong>{pct(item.match.components.description_tfidf)}</strong></span><span>Amount difference<strong>{item.match.components.amount_difference_pct}%</strong></span><span>Date gap<strong>{item.match.components.date_gap_days} days</strong></span></div>
    </section>}
    <section className="fs-evidence-section blue"><h3><span>{matched ? '4' : '3'}</span>What should I do next?</h3><p>{next}</p>
      <label className="fs-label">Reviewer note<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Evidence for the department owner to verify…"/></label>
      <p className="fs-chart-note">Download a handoff for your partner’s review system. This screen does not save a decision.</p>
    </section>
    <div className="fs-dialog-actions"><button onClick={() => download(`evidence-${invoice.id}.json`, item)}><Icon name="download"/>Export evidence</button>
      <button className="fs-primary" onClick={() => onHandoff({ invoice_id: invoice.id, disposition: 'PENDING_REVIEW', note, evidence: item, generated_at: new Date().toISOString(), persisted: false })}>Prepare review handoff</button>
    </div>
  </Modal>
}

function Copilot({ items, onClose }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([{ who: 'assistant', text: 'I can explain the supplied invoice evidence. Ask about an invoice number, duplicate matches, or the review queue. Answers use this analysis; no language model is connected.' }])
  function ask(text) {
    if (!text.trim()) return
    const target = items.find((item) => text.toLowerCase().includes(item.invoice.invoice_number.toLowerCase()))
    const item = target || (/duplicat|similar/i.test(text) ? items.find((row) => row.match) : null)
    const answer = item
      ? `${item.invoice.invoice_number} · ${item.invoice.supplier}: ${item.signals.map((signal) => signal.reason).join(' ') || 'No exceptions detected.'}${item.match ? ` Weighted similarity ${pct(item.match.similarity)}; description TF-IDF ${pct(item.match.components.description_tfidf)}. Similarity is a review signal, not proof of fraud.` : ''}`
      : `This batch contains ${items.length} invoices, ${items.filter((row) => row.review_required).length} flagged, ${items.filter((row) => row.queue?.tier === 'REVIEW_NOW').length} selected for human review and ${items.filter((row) => row.match).length} potential duplicates. Specify an invoice number to inspect its evidence. I cannot answer beyond the supplied analysis.`
    setMessages((previous) => [...previous, { who: 'user', text }, { who: 'assistant', text: answer }])
    setQuery('')
  }
  return <Modal title="FinSight AP Copilot" onClose={onClose} drawer>
    <p className="fs-subtitle">Evidence assistant · deterministic answers</p>
    <div className="fs-suggestions"><button onClick={() => ask('Explain duplicate matches')}>Explain near-duplicates</button><button onClick={() => ask('Summarize the queue')}>Queue summary</button></div>
    <div className="fs-messages" aria-live="polite">{messages.map((message, index) => <div key={index} className={message.who}><small>{message.who === 'user' ? 'YOU' : 'FINSIGHT'}</small><p>{message.text}</p></div>)}</div>
    <form className="fs-chat-form" onSubmit={(event) => { event.preventDefault(); ask(query) }}><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={500} aria-label="Ask about invoice evidence" placeholder="Ask about an invoice or duplicate…"/><button className="fs-primary" disabled={!query.trim()}>Send</button></form>
  </Modal>
}

export default function FinSight() {
  const [page, setPage] = useState('dashboard')
  const [role, setRole] = useState('Analyst')
  const [login, setLogin] = useState(true)
  const [menu, setMenu] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [input, setInput] = useState(null)
  const [provenance, setProvenance] = useState('')
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [rule, setRule] = useState('ALL')
  const [department, setDepartment] = useState('ALL')
  const [tab, setTab] = useState('overview')
  const [selected, setSelected] = useState(null)
  const [upload, setUpload] = useState(false)
  const [copilot, setCopilot] = useState(false)
  const [toast, setToast] = useState('')
  const [audit, setAudit] = useState([])
  const [auditError, setAuditError] = useState('')
  const [invoiceLedger, setInvoiceLedger] = useState({ items: [], offset: 0, has_more: false })
  const windowId = input?.window_id || 'default'

  const loadSample = useCallback(async () => {
    setLoading(true)
    try {
      for (let offset = 0; offset < 5000; offset += 500) {
        setProgress(`Analyzing synthetic test invoices ${offset + 1}–${offset + 500} of 5,000…`)
        await api.analyzeInvoices(await api.getInvoiceSample(offset))
      }
      const data = await api.getInvoiceDataset('synthetic-5000-v1')
      setAnalysis(data); setInput({ window_id: data.window_id }); setProvenance(data.provenance); setError('')
    } catch (err) { setError(err.message) } finally { setLoading(false); setProgress('') }
  }, [])
  const loadSaved = useCallback(async () => {
    try {
      const data = await api.getInvoiceDataset()
      if (!data.population || (data.population === 6 && data.items.every((item) => item.invoice.id.startsWith('demo-')))) return await loadSample()
      setAnalysis(data); setInput({ window_id: data.window_id }); setProvenance(data.provenance); setError('')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [loadSample])

  const loadDemo = useCallback(async () => {
    try {
      const { provenance: source, ...payload } = await api.getInvoiceDemo()
      const result = await api.analyzeInvoices(payload)
      setInput(payload); setAnalysis(result); setProvenance(source); setError('')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [])
  // oxlint-disable-next-line react/set-state-in-effect -- Synchronize with external API on mount.
  useEffect(() => { loadSaved(); api.getHealth().then(setHealth).catch(() => setHealth(null)) }, [loadSaved])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer) }, [toast])
  const loadAudit = useCallback(async () => {
    try {
      const [records, ledger] = await Promise.allSettled([api.getAuditLog(50), api.getInvoiceAudit(windowId, 0, page === 'review' ? 'ALLOCATED' : 'ALL')])
      if (records.status === 'fulfilled') setAudit(records.value)
      if (ledger.status === 'fulfilled') setInvoiceLedger(ledger.value)
      setAuditError([records, ledger].filter((entry) => entry.status === 'rejected').map((entry) => entry.reason.message).join(' '))
    } catch (err) { setAuditError(err.message) }
  }, [windowId, page])
  // oxlint-disable-next-line react/set-state-in-effect -- Load external audit records when the view opens.
  useEffect(() => { if (['audit', 'review'].includes(page)) loadAudit() }, [page, loadAudit])

  async function refresh() {
    if (!input) { setLoading(true); return loadSaved() }
    setLoading(true); setError('')
    try { setAnalysis(await api.getInvoiceDataset(windowId)); setToast('Saved population refreshed from the database.') } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  async function importFile(file) {
    // Review intake must be finalized only after all batches have been imported.
    if (!file) return
    if (file.size > 20_000_000) { setError('Choose a CSV or JSON file smaller than 20 MB.'); return }
    setLoading(true); setError('')
    try {
      const text = await file.text()
      if (file.name.toLowerCase().endsWith('.csv')) {
        const result = await api.importInvoices(text); setInput(result.input); setAnalysis(result.analysis)
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const payload = JSON.parse(text)
        if (!Array.isArray(payload.invoices) || !payload.invoices.length || payload.invoices.length > 5000) throw new Error('JSON must contain 1–5,000 invoices.')
        if (new Set(payload.invoices.map((row) => row.id)).size !== payload.invoices.length) throw new Error('Invoice IDs must be unique.')
        const rows = [...payload.invoices].sort((a, b) => a.date.localeCompare(b.date))
        for (let offset = 0; offset < rows.length; offset += 500) {
          setProgress(`Importing invoices ${offset + 1}–${Math.min(offset + 500, rows.length)} of ${rows.length}…`)
          const history = [...(payload.history || []), ...rows.slice(Math.max(0, offset - 2000), offset)].slice(-2000)
          await api.analyzeInvoices({ ...payload, invoices: rows.slice(offset, offset + 500), history })
        }
        setInput(payload); setAnalysis(await api.getInvoiceDataset(payload.window_id || 'default'))
      } else { throw new Error('Choose a .csv or .json file.') }
      setProvenance(`Imported file: ${file.name}. Results depend on the supplied history and policy.`)
      setUpload(false); navigate('invoices'); setToast('Batch analyzed successfully.')
    } catch (err) { setError(err.message) } finally { setLoading(false); setProgress('') }
  }
  async function finalizeQueue() {
    try {
      const queue = await api.finalizeInvoiceWindow(input?.window_id || 'default')
      setAnalysis((current) => ({ ...current, queue })); await loadAudit()
      setToast('Intake frozen. Queue finalized; new invoices require a new window ID.')
    } catch (err) { setAuditError(err.message) }
  }
  async function changeLedgerPage(offset) {
    try { setInvoiceLedger(await api.getInvoiceAudit(input?.window_id || 'default', offset, page === 'review' ? 'ALLOCATED' : 'ALL')); setAuditError('') }
    catch (err) { setAuditError(err.message) }
  }
  async function changeDatasetPage(offset) {
    setLoading(true)
    try { setAnalysis(await api.getInvoiceDataset(windowId, offset)) } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  function navigate(next) {
    setPage(next); setMenu(false); setSearch(''); setSeverity('ALL'); setStatus('ALL'); setRule('ALL'); setDepartment('ALL')
  }
  const items = analysis?.items || []
  const flagged = items.filter((item) => item.review_required)
  const visible = items.filter((item) => {
    const haystack = `${item.invoice.invoice_number} ${item.invoice.supplier} ${item.invoice.department} ${item.signals.map((signal) => `${signal.code} ${signal.reason}`).join(' ')}`.toLowerCase()
    return haystack.includes(search.toLowerCase()) && (severity === 'ALL' || severity === item.severity)
      && (status === 'ALL' || status === item.status) && (department === 'ALL' || department === item.invoice.department)
      && (rule === 'ALL' || item.signals.some((signal) => signal.code === rule))
  })
  const exposure = analysis?.summary?.flagged_exposure_inr ?? flagged.filter((item) => item.invoice.currency === 'INR').reduce((sum, item) => sum + item.invoice.amount, 0)
  const registryItems = visible.filter((item) => page !== 'exceptions' || item.review_required)

  if (login) return <MotionConfig reducedMotion="user"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fs-login"><div className="fs-login-wrap"><Brand large/><h1>Accounts Payable Exception Intelligence</h1>
    <div className="fs-login-card"><label className="fs-label">SELECT DEMO ROLE PERSONA</label>
      <div className="fs-role-options">{['Analyst', 'Admin', 'Auditor'].map((persona) => <button key={persona} className={role === persona ? 'selected' : ''} onClick={() => setRole(persona)}><strong>{persona}</strong><small>{persona === 'Analyst' ? 'Investigations' : persona === 'Admin' ? 'Workspace overview' : 'Compliance'}</small></button>)}</div>
      <label className="fs-label">Workspace user<input value="Tulsi Tomar" readOnly/></label>
      <button className="fs-primary fs-enter" onClick={() => setLogin(false)}>Enter demo workspace</button>
      <div className="fs-login-footer"><Icon name="shield" size={15}/><span>Demo personas · authentication integration pending</span></div>
    </div></div></motion.div></MotionConfig>

  return <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: 'easeOut' }}><div className="finsight">
    <aside className={`fs-sidebar ${menu ? 'open' : ''}`}><Brand/>
      <div className="fs-persona"><span className="fs-dot"/><div><strong>Tulsi Tomar</strong><small>ROLE: {role.toUpperCase()} · DEMO</small></div></div>
      <div className="fs-nav-label">CORE MODULES</div>
      <nav aria-label="Main navigation">{NAV.map(([key, label, icon]) => <button key={key} className={page === key ? 'active' : ''} onClick={() => navigate(key)} aria-current={page === key ? 'page' : undefined}><Icon name={icon}/><span>{label}</span>{key === 'exceptions' && <small className="fs-active-count">{flagged.length} Active</small>}</button>)}</nav>
      <div className="fs-nav-label">ASSISTANTS & PIPELINE</div>
      <nav aria-label="Analysis tools"><button onClick={() => setCopilot(true)}><Icon name="bot"/><span>AP Copilot Assistant</span></button><button onClick={() => setUpload(true)}><Icon name="upload"/><span>Batch Ingestion</span><small>CSV / JSON</small></button></nav>
      <div className="fs-sidebar-footer"><strong>Team 305</strong><span>Microsoft Innovate 2026 · Bennett University</span><small>Local decision support workspace</small></div>
    </aside>
    <div className="fs-main"><header className="fs-topbar">
      <button className="fs-icon-button fs-mobile-menu" aria-label="Toggle navigation" onClick={() => setMenu(!menu)}><Icon name="menu"/></button>
      <label className="fs-global-search"><Icon name="search"/><input aria-label="Search invoices, suppliers or rules" placeholder="Search invoices, suppliers, or rules…" value={search} onChange={(event) => { setSearch(event.target.value); if (!['invoices', 'exceptions'].includes(page)) setPage('invoices') }}/></label>
      <div className="fs-topbar-actions"><button className="fs-dark" onClick={() => setCopilot(true)}><Icon name="bot"/>AP Copilot <small>AI</small></button><button onClick={() => setUpload(true)}><Icon name="upload"/>Batch Upload</button>
        <span className="fs-api-state"><i className={health?.model_loaded ? 'ready' : ''}/>{health?.model_loaded ? 'API Live' : 'API unavailable'}</span>
        <label className="fs-role-select"><Icon name="shield" size={14}/><select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Demo persona">{['Analyst', 'Admin', 'Auditor'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <button className="fs-user" onClick={() => setLogin(true)}><span>TT</span>Tulsi Tomar</button>
      </div>
    </header>
    <AnimatePresence mode="wait" initial={false}><motion.main key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fs-content" aria-busy={loading}>
      <div className="fs-page-heading"><div><h1><Icon name={NAV.find((entry) => entry[0] === page)?.[2] || 'grid'} size={25}/>{TITLES[page]}</h1><p>{page === 'audit' ? 'Complete invoice evidence saved in the existing MerchantShield database.' : 'Invoice validation, matching evidence and bounded human review.'}</p></div>
        <div className="fs-heading-actions"><button disabled={loading} onClick={['audit', 'review'].includes(page) ? loadAudit : refresh}><Icon name="refresh"/>{loading ? 'Analyzing…' : 'Refresh'}</button><button disabled={!analysis} onClick={() => download(page === 'audit' ? 'finsight-audit-page.json' : 'finsight-analysis.json', page === 'audit' ? invoiceLedger : { ...analysis, provenance })}><Icon name="download"/>Export {page === 'audit' ? 'ledger page' : 'evidence'}</button></div>
      </div>
      {error && <div className="fs-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" size={16}/></button></div>}
      {loading && <div className="fs-loading" role="status">{progress || 'Loading saved invoice evidence…'}</div>}
      {analysis?.audit_warning && <div className="fs-error" role="alert">{analysis.audit_warning}</div>}
      {analysis?.queue?.critical_overflow > 0 && <div className="fs-error" role="alert">{analysis.queue.critical_overflow} critical cases outside the human review budget. Their flags and evidence remain stored; adjust capacity with your team.</div>}
      {!['transactions', 'audit'].includes(page) && <div className="fs-source"><span className="fs-source-tag">{windowId.startsWith('synthetic-') || provenance.includes('Fictional') ? 'SYNTHETIC TEST DATA' : 'DATABASE RECORDS'}</span><span>{provenance} {analysis?.view_scope}</span><button disabled={loading} onClick={loadSample}>Load 5,000 test invoices</button></div>}

      {page === 'dashboard' && <>
        <div className="fs-kpi-grid">{[[analysis?.summary?.invoices || 0, 'Invoices analyzed', 'Complete selected window'], [analysis?.summary?.flagged || 0, 'Flagged invoices', 'Complete evidence retained'], [analysis?.queue?.review_now || 0, 'Human review tasks', 'Shared window · 100 per million'], [analysis?.queue?.monitor || 0, 'Monitoring cases', 'Separate from human tasks'], [money(exposure), 'Flagged exposure · INR', 'Invoice value, not realized savings']].map(([value, label, context], index) => <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} whileHover={{ y: -2 }} className="fs-kpi" key={label}><small>{label}</small><strong>{value}</strong><span>{context}</span></motion.article>)}</div>
        <Panel title="Detection Funnel & Review Budget" subtitle="Rules and fuzzy matching first · unresolved cases proceed to ML"><p>{analysis?.cascade?.rule_flagged || 0} rule / duplicate findings · {analysis?.cascade?.baseline_clear || 0} baseline clears · {analysis?.cascade?.ml_routed || 0} routed to ML ({pct(analysis?.cascade?.ml_fraction || 0)} observed; 30% target).</p><p>{analysis?.queue?.population || 0} distinct invoices in window · {analysis?.queue?.deferred || 0} deferred flags retained. Tiny windows round upward. Similarity identifies potential duplicates; it does not certify legitimacy.</p><button onClick={() => navigate('review')}>Open priority review queue <Icon name="chevron" size={14}/></button></Panel>
        <div className="fs-tabs" role="tablist" aria-label="Dashboard view">{[['overview', 'Surveillance Overview'], ['rules', 'Rule Frequency & Cost Centers'], ['suppliers', 'Supplier Risk Matrix']].map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}<span>{items.length} INVOICES · CURRENT BATCH</span></div>
        {tab !== 'suppliers' ? <div className="fs-chart-grid"><Panel title={tab === 'overview' ? 'Invoice Volume & Exception Classification (7-Day)' : 'Rule Detection Frequency'} subtitle="Computed from the currently analyzed batch">{tab === 'overview' ? <Trend items={items}/> : <RuleChart items={items}/>}</Panel><Panel title="Department Risk Exposure" subtitle="Flagged invoice concentration across cost centers"><DepartmentChart items={items}/></Panel></div>
          : <Panel title="Supplier Risk Matrix" subtitle="Highest triage score by supplier · not a fraud probability"><div className="fs-supplier-matrix">{Object.values(items.reduce((acc, item) => { const key = item.invoice.supplier_id || item.invoice.supplier; if (!acc[key] || acc[key].risk_score < item.risk_score) acc[key] = item; return acc }, {})).map((item) => <button key={item.invoice.id} onClick={() => setSelected(item)}><strong>{item.invoice.supplier}</strong><Badge value={item.severity}/><span>{item.risk_score}/100 triage score</span><small>{item.anomaly.prior_count} prior supplier invoices</small></button>)}</div></Panel>}
        <div className="fs-workbench"><Panel title="Active Exceptions Under Surveillance" subtitle="Review the evidence behind each flagged invoice" action={<button onClick={() => navigate('exceptions')}>Full Workbench <Icon name="chevron" size={14}/></button>}><InvoiceTable items={flagged} onOpen={setSelected} compact/></Panel></div>
      </>}

      {(page === 'invoices' || page === 'exceptions') && <>
        <div className="fs-heading-actions"><span>{analysis?.summary?.invoices || 0} saved invoices · showing {items.length} on this page</span><button disabled={loading || !analysis?.offset} onClick={() => changeDatasetPage(Math.max(0, (analysis?.offset || 0) - 200))}>Previous page</button><button disabled={loading || !analysis?.has_more} onClick={() => changeDatasetPage((analysis?.offset || 0) + 200)}>Next page</button></div>
        <section className="fs-panel fs-filters"><div className="fs-filter-line"><label className="fs-search"><Icon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Filter invoice results" placeholder="Search by invoice number, supplier name, or rule reason…"/></label>
          {page === 'exceptions' ? <select aria-label="Rule filter" value={rule} onChange={(event) => setRule(event.target.value)}><option value="ALL">All Automated Rules</option>{Object.entries(LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <select aria-label="Department filter" value={department} onChange={(event) => setDepartment(event.target.value)}><option value="ALL">All Departments</option>{[...new Set(items.map((item) => item.invoice.department))].map((name) => <option key={name}>{name}</option>)}</select>}
        </div><div className="fs-filter-chips"><span><Icon name="filter" size={14}/>{page === 'exceptions' ? 'Severity Filter:' : 'Status:'}</span>{(page === 'exceptions' ? ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] : ['ALL', 'FLAGGED', 'CLEARED']).map((value) => <button key={value} className={(page === 'exceptions' ? severity : status) === value ? 'selected' : ''} onClick={() => page === 'exceptions' ? setSeverity(value) : setStatus(value)}>{value}</button>)}</div></section>
        <Panel title={page === 'exceptions' ? 'Active Exceptions Under Surveillance' : 'Invoice Registry'} subtitle={`${registryItems.length} matching invoices · open a record to inspect evidence`}><InvoiceTable items={registryItems} onOpen={setSelected} compact={page === 'exceptions'}/></Panel>
      </>}

      {(page === 'analytics' || page === 'bi') && <>
        <div className="fs-kpi-grid three">{[[analysis?.summary.critical || 0, 'Critical review signals', 'Caller-supplied watchlist matches'], [analysis?.summary.duplicates || 0, 'Potential duplicate pairs', 'Exact and near-duplicate evidence'], [analysis?.cascade?.ml_executed || 0, 'Isolation Forest executions', 'Only unresolved cases with enough history']].map(([value, label, context]) => <article className="fs-kpi" key={label}><small>{label}</small><strong>{value}</strong><span>{context}</span></article>)}</div>
        <div className="fs-chart-grid"><Panel title="Rule Detection Frequency & Policy Exposure" subtitle="Which rules require the most attention?"><RuleChart items={items}/></Panel><Panel title="Department Exception Share" subtitle="Invoice counts, without currency conversion"><DepartmentChart items={items}/></Panel></div>
        <div className="fs-workbench"><Panel title="7-Day Invoice Activity" subtitle="Current batch only · external BI integration belongs to your partner"><Trend items={items}/></Panel></div>
      </>}

      {['audit', 'review'].includes(page) && <>
        <div className="fs-source"><span className="fs-source-tag">MERCHANTSHIELD DATABASE</span><span>{page === 'review' ? 'Human tasks: REVIEW NOW. MONITOR is a separate watch queue. All other flags remain in the ledger.' : 'Persisted invoice findings, matching evidence, ML routing and priority components. Final reviewer decisions remain with your partner.'}</span></div>
        {auditError && <div className="fs-error" role="alert">{auditError}</div>}
        {page === 'review' && <Panel title={invoiceLedger.finalized ? 'Finalized review window' : 'Preview allocation · intake still open'} subtitle="Finalize after the complete flagged list is ready, before assigning human tasks"><p>Freezing intake keeps selected review cases stable. Monitoring does not require human assignment. Partner-owned reviewer decisions remain separate.</p><button disabled={invoiceLedger.finalized || !analysis?.audit_persisted} onClick={finalizeQueue}>{invoiceLedger.finalized ? 'Queue finalized' : 'Freeze intake & finalize queue'}</button></Panel>}
        <Panel title={page === 'review' ? 'Allocated Review & Monitoring Cases' : 'Descriptive Invoice Audit Trail'} subtitle={`${invoiceLedger.population || 0} records · page ${Math.floor(invoiceLedger.offset / 200) + 1}`}><InvoiceTable items={invoiceLedger.items} onOpen={setSelected}/>{invoiceLedger.items.map((item) => <details key={item.invoice.id}><summary>{item.invoice.invoice_number} · {item.queue.tier.replaceAll('_', ' ')} · inspect complete evidence</summary><pre>{JSON.stringify(item, null, 2)}</pre></details>)}<div className="fs-heading-actions"><button disabled={invoiceLedger.offset === 0} onClick={() => changeLedgerPage(Math.max(0, invoiceLedger.offset - 200))}>Previous</button><button disabled={!invoiceLedger.has_more} onClick={() => changeLedgerPage(invoiceLedger.offset + 200)}>Next</button></div></Panel>
      </>}
      {page === 'audit' && <>
        <Panel title="Event Verification Stream" subtitle="Recent transaction decisions from the existing backend"><div className="fs-audit-stream">{audit.map((event, index) => <article key={event.request_id || index}><span className="fs-audit-icon"><Icon name="shield"/></span><div><div className="fs-audit-head"><strong>MerchantShield decision engine</strong><small>{event.timestamp || event.created_at || ''}</small></div><Badge value={event.action || 'RECORDED'}/><p>Transaction {event.transaction_id || '—'}</p><p>{event.policy_reason || event.reason || 'Inspect the complete record for decision evidence.'}</p><details><summary>Inspect stored record</summary><pre>{JSON.stringify(event, null, 2)}</pre></details></div></article>)}{!audit.length && <div className="fs-empty">No transaction audit records yet. Run a transaction evaluation to create one.</div>}</div></Panel>
      </>}
      {page === 'transactions' && <div className="fs-legacy"><TransactionWorkspace/></div>}
    </motion.main></AnimatePresence><footer className="fs-content-footer">FinSight · Bounded review, complete evidence<span>No automatic payment actions</span></footer></div>

    {selected && <Investigation item={selected} onClose={() => setSelected(null)} onHandoff={(handoff) => { download(`review-handoff-${handoff.invoice_id}.json`, handoff); setToast('Review handoff downloaded. No decision was saved.'); setSelected(null) }}/ >}
    {copilot && <Copilot items={items} onClose={() => setCopilot(false)}/ >}
    {upload && <Modal title="Batch Ingestion" onClose={() => setUpload(false)}><p className="fs-subtitle">Import up to 5,000 invoices per file; processed in batches of 500. JSON can include history and policy.</p>
      <div className="fs-upload-area"><Icon name="upload" size={36}/><h3>Upload an invoice batch</h3><p>CSV or JSON · maximum 20 MB</p><label className="fs-upload-input">Choose file<input type="file" accept=".csv,.json" disabled={loading} onChange={(event) => importFile(event.target.files?.[0])}/></label></div>
      {error && <p className="fs-error" role="alert">{error}</p>}
      <div className="fs-upload-info"><h3>Required invoice columns</h3><code>id, invoice_number, supplier, department, amount, date, description</code><p>Optional: supplier_id, currency, po_number, tax_id. Dates use YYYY-MM-DD. CSV has no external history or department limits; use JSON to supply them.</p><button disabled={!input} onClick={() => download('finsight-input-template.json', { invoices: items.map((row) => row.invoice), history: [], window_id: 'new-import-window' })}>Download displayed invoice template</button><button disabled={loading} onClick={async () => { setLoading(true); await loadDemo(); setUpload(false) }}>Load included demonstration</button></div>
    </Modal>}
    <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fs-toast" role="status">{toast}</motion.div>}</AnimatePresence>
  </div></MotionConfig>
}
