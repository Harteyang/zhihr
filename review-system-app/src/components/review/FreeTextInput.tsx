import { Textarea } from '@/components/ui/textarea'

interface FreeTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function FreeTextInput({ value, onChange, placeholder }: FreeTextInputProps) {
  return (
    <Textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      placeholder={placeholder}
      className="resize-none"
    />
  )
}
