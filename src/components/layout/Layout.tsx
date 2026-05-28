import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

type LayoutProps = {
  children: ReactNode
}

// Shared page shell wrapping pages with header/footer.
function Layout({ children }: LayoutProps) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default Layout
