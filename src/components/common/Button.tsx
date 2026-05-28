import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

// Reusable button. Extend as design system grows.
function Button({ children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} {...rest}>
      {children}
    </button>
  )
}

export default Button
