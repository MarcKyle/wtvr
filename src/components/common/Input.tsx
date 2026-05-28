import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

// Generic labeled input. Pairs with form-level validation.
function Input({ label, id, ...rest }: InputProps) {
  return (
    <label htmlFor={id}>
      {label}
      <input id={id} {...rest} />
    </label>
  )
}

export default Input
