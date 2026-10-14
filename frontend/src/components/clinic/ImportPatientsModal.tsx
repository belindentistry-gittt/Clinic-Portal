import { Download, FileUp, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { importPatients, type PatientImportResult } from '../../api/patients'
import { ApiError } from '../../api/client'
import { ActionButton, ErrorNote, Modal } from './ui'

/**
 * Bulk-import old patient records from a CSV export of a previous system or
 * paper register. Each row becomes its own patient, matched against the
 * existing directory by phone/email so a re-upload (or overlap with patients
 * already in the system) is reported as a duplicate rather than created
 * twice - the same identifiers a website booking is matched on.
 */

interface ImportPatientsModalProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

const TEMPLATE_HEADER =
  'First Name,Last Name,Phone,Email,Date of Birth,Gender,Address Line 1,City,State,Postal Code,Notes'
const TEMPLATE_EXAMPLE =
  'Priya,Sharma,+91 90000 00001,priya@example.com,1990-05-14,female,12 Gandhi Street,Coimbatore,Tamil Nadu,641001,Prefers morning appointments'

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'patient-import-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportPatientsModal(props: ImportPatientsModalProps) {
  if (!props.open) return null
  return <ImportPatientsModalBody {...props} />
}

function ImportPatientsModalBody({ onClose, onImported }: ImportPatientsModalProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PatientImportResult | null>(null)

  async function upload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const outcome = await importPatients(file)
      setResult(outcome)
      if (outcome.created > 0) onImported()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not import that file.')
    } finally {
      setUploading(false)
    }
  }

  const issues = result?.results.filter((row) => row.result !== 'created') ?? []

  return (
    <Modal open title="Import Patients from CSV" onClose={onClose} width="max-w-xl">
      {!result && (
        <>
          <p className="mb-4 text-sm text-(--color-ink-soft)">
            Bring in an old patient list from a spreadsheet. Only <strong>First Name</strong> is
            required — everything else is optional. A row that matches an existing patient&rsquo;s
            phone or email is skipped, not duplicated.
          </p>

          <button
            type="button"
            onClick={downloadTemplate}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-(--color-accent) hover:underline"
          >
            <Download className="h-4 w-4" /> Download CSV template
          </button>

          {error && (
            <div className="mb-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-(--color-border) px-5 py-8 text-center hover:border-(--color-accent)"
            onClick={() => fileInput.current?.click()}
          >
            <FileUp className="h-6 w-6 text-(--color-ink-faint)" strokeWidth={1.75} />
            <p className="text-sm font-medium text-(--color-ink)">
              {file ? file.name : 'Click to choose a CSV file'}
            </p>
            <p className="text-xs text-(--color-ink-soft)">
              Exported or saved as CSV from Excel/Google Sheets
            </p>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <ActionButton tone="primary" onClick={upload} disabled={!file || uploading}>
              <Upload className="h-4 w-4" /> {uploading ? 'Importing…' : 'Import'}
            </ActionButton>
          </div>
        </>
      )}

      {result && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-3">
              <p className="text-2xl font-semibold text-(--color-accent)">{result.created}</p>
              <p className="text-xs text-(--color-ink-soft)">Added</p>
            </div>
            <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-3">
              <p className="text-2xl font-semibold text-(--color-ink)">{result.duplicates}</p>
              <p className="text-xs text-(--color-ink-soft)">Already existed</p>
            </div>
            <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-3">
              <p className="text-2xl font-semibold text-(--color-danger)">{result.errors}</p>
              <p className="text-xs text-(--color-ink-soft)">Skipped</p>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-(--color-border)">
              <table className="w-full text-left text-sm">
                <thead className="bg-(--color-surface) text-xs text-(--color-ink-soft)">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-border)">
                  {issues.map((row) => (
                    <tr key={row.row}>
                      <td className="px-3 py-2 text-(--color-ink-soft)">{row.row}</td>
                      <td className="px-3 py-2 capitalize">{row.result}</td>
                      <td className="px-3 py-2 text-(--color-ink-soft)">{row.detail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <ActionButton
              onClick={() => {
                setResult(null)
                setFile(null)
                setError(null)
              }}
            >
              Import Another File
            </ActionButton>
            <ActionButton tone="primary" onClick={onClose}>
              Done
            </ActionButton>
          </div>
        </>
      )}
    </Modal>
  )
}
