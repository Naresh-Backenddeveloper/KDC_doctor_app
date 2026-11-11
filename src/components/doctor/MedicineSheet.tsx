import React from 'react'
import { AlertTriangle, ChevronRight } from '../primitives/icons'
import { Btn, Div, P, Span } from '../primitives/index'
import { Button } from '../ui/Button'
import { Banner, ModalSheet } from '../ui/Feedback'
import { FieldError, FormSelect, FormTextArea, useZodForm } from '../ui/Form'
import { Checkbox, SearchInput } from '../ui/Inputs'
import { StatusBadge } from '../ui/Display'
import { checkAllergies } from '../../domain/allergy'
import { DOSAGE_OPTIONS, DURATION_OPTIONS, FOOD_OPTIONS, FREQUENCY_OPTIONS, searchMedicines, toPrescribed } from '../../domain/medicines'
import { MEDICINE_CATALOG } from '../../mock-data/medicines'
import type { AllergyConflict, CatalogMedicine, PrescribedMedicine } from '../../types'
import { allergyOverrideSchema, medicineSchema, type MedicineForm } from '../../validation/schemas'
import { useController, type Control } from 'react-hook-form'

function conflictsLine(c: AllergyConflict[]) {
  return c
    .map((x) => (x.kind === 'direct' ? `Contains ${x.ingredient} — recorded allergy: ${x.allergen}.` : `${x.ingredient}: ${x.note} Recorded allergy: ${x.allergen}.`))
    .join(' ')
}

/** Search-first picker, then the regimen form, then the allergy decision if one is needed. */
export function MedicineSheet({
  initial,
  editing,
  allergies,
  onSave,
  onClose,
}: {
  initial?: CatalogMedicine
  editing?: PrescribedMedicine
  allergies: string[]
  onSave: (medicine: PrescribedMedicine) => void
  onClose: () => void
}) {
  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState<CatalogMedicine | undefined>(initial)
  const base: PrescribedMedicine | undefined = editing ?? (selected ? toPrescribed(selected) : undefined)

  const form = useZodForm(medicineSchema, {
    dosage: base?.dosage ?? '',
    frequency: base?.frequency ?? '',
    duration: base?.duration ?? '',
    food: base?.food ?? '',
    instructions: base?.instructions ?? '',
  })
  const overrideForm = useZodForm(allergyOverrideSchema, {
    acknowledged: Boolean(editing?.allergyOverride),
    reason: editing?.allergyOverride?.reason ?? '',
  })

  const details = editing ?? (selected ? toPrescribed(selected) : undefined)
  const contents = selected ?? (editing ? MEDICINE_CATALOG.find((m) => m.name === editing.name) : undefined)
  const conflicts = details
    ? checkAllergies({ name: details.name, strength: details.strength, salts: contents?.salts }, allergies)
    : []

  const choose = (m: CatalogMedicine) => {
    setSelected(m)
    const next = toPrescribed(m)
    form.reset({ dosage: next.dosage, frequency: next.frequency, duration: next.duration, food: next.food, instructions: next.instructions })
    overrideForm.reset({ acknowledged: false, reason: '' })
  }

  const submit = form.handleSubmit(async (regimen: MedicineForm) => {
    if (!details) return
    if (conflicts.length) {
      if (!(await overrideForm.trigger())) return
      const reason = overrideForm.getValues('reason').trim()
      onSave({ ...details, ...regimen, allergyOverride: { allergens: conflicts.map((c) => c.allergen), reason, at: new Date().toISOString() } })
      return
    }
    onSave({ ...details, ...regimen, allergyOverride: undefined })
  })

  if (!details) {
    const results = searchMedicines(query)
    return (
      <ModalSheet visible title="Add medicine" subtitle="Search by brand or salt" onClose={onClose}>
        <Div className="gap-2.5 pb-2">
          <SearchInput placeholder="Search medicine by brand or salt" value={query} onChange={setQuery} />
          {results.length === 0 && <P className="py-4 text-center text-body text-ink-400">No medicines match.</P>}
          {results.map((m) => {
            const risk = checkAllergies(m, allergies).length > 0
            return (
              <Btn
                key={m.id}
                onPress={() => choose(m)}
                className="tap flex-row w-full items-center gap-3 rounded-tile bg-ink-50 px-3.5 py-3 text-left"
              >
                <Div className="min-w-0 flex-1">
                  <P className="truncate text-body-lg font-semibold text-ink-900">{m.name}</P>
                  <P className="truncate text-caption text-ink-500">{m.strength}</P>
                </Div>
                {risk ? <StatusBadge tone="critical">Allergy</StatusBadge> : <ChevronRight className="h-[16px] w-[16px] text-ink-300" />}
              </Btn>
            )
          })}
        </Div>
      </ModalSheet>
    )
  }

  return (
    <ModalSheet
      visible
      title={details.name}
      subtitle={details.strength}
      onClose={onClose}
      footer={
        <Button variant={conflicts.length ? 'danger' : 'primary'} onClick={submit} loading={form.formState.isSubmitting}>
          {conflicts.length ? 'Override and add' : editing ? 'Save medicine' : 'Add Medicine'}
        </Button>
      }
    >
      <Div className="gap-3.5 pb-2">
        {conflicts.length > 0 && (
          <Banner
            tone="critical"
            icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.4} />}
            title={`Allergy risk: ${conflicts.map((c) => c.allergen).join(', ')}`}
            body={conflictsLine(conflicts)}
          />
        )}
        <FormSelect control={form.control} name="dosage" label="Dosage" required options={DOSAGE_OPTIONS} />
        <FormSelect control={form.control} name="frequency" label="Frequency" required options={FREQUENCY_OPTIONS} />
        <FormSelect control={form.control} name="duration" label="Duration" required options={DURATION_OPTIONS} />
        <FormSelect control={form.control} name="food" label="Food" required options={FOOD_OPTIONS} />
        <FormTextArea control={form.control} name="instructions" label="Instructions" className="min-h-[76px]" />
        {conflicts.length > 0 && <OverrideFields control={overrideForm.control} />}
      </Div>
    </ModalSheet>
  )
}

function OverrideFields({ control }: { control: Control<{ acknowledged: boolean; reason: string }> }) {
  const { field, fieldState } = useController({ control, name: 'acknowledged' })
  return (
    <Div className="gap-3 rounded-tile bg-critical-50 p-3.5">
      <Span className="block text-body-sm font-bold text-critical-700">Prescribe despite this allergy?</Span>
      <Div>
        <Checkbox checked={field.value} onClick={() => field.onChange(!field.value)} label="I have reviewed this allergy and take responsibility for prescribing this medicine." />
        <FieldError message={fieldState.error?.message} />
      </Div>
      <FormTextArea control={control} name="reason" label="Clinical reason" required className="min-h-[72px] !bg-white" placeholder="Why the benefit outweighs the risk" />
    </Div>
  )
}
