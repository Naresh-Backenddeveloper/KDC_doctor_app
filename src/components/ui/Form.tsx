import React from 'react'
import { useController, useForm, type Control, type DefaultValues, type FieldValues, type Path, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { P } from '../primitives/index'
import { Field, Input, SelectField, TextArea } from './Inputs'

export function useZodForm<T extends FieldValues>(schema: z.ZodType<T, any>, defaultValues: T) {
  return useForm<T>({ resolver: zodResolver(schema as any) as Resolver<T>, defaultValues: defaultValues as DefaultValues<T> })
}

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  hint?: string
  required?: boolean
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  transform,
  ...input
}: BaseProps<T> & { transform?: (v: string) => string } & Record<string, any>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Field label={label} hint={hint} required={required} error={fieldState.error?.message}>
      <Input
        value={(field.value ?? '') as string}
        onChangeText={(v: string) => field.onChange(transform ? transform(v) : v)}
        onBlur={field.onBlur}
        {...input}
      />
    </Field>
  )
}

export function FormTextArea<T extends FieldValues>({ control, name, label, hint, required, ...input }: BaseProps<T> & Record<string, any>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Field label={label} hint={hint} required={required} error={fieldState.error?.message}>
      <TextArea value={(field.value ?? '') as string} onChangeText={field.onChange} onBlur={field.onBlur} {...input} />
    </Field>
  )
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  required,
  options,
  title,
  placeholder,
}: BaseProps<T> & { options: string[]; title?: string; placeholder?: string }) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Field label={label} hint={hint} required={required} error={fieldState.error?.message}>
      <SelectField
        value={(field.value ?? '') as string}
        options={options}
        onChange={field.onChange}
        title={title ?? label}
        placeholder={placeholder}
      />
    </Field>
  )
}

/** For a control that is not wrapped in a Field, such as a chip group or grid cell. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <P className="mt-1 text-caption text-critical-600">{message}</P>
}
