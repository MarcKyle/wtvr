// Site-wide footer.
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      marginTop: 'auto',
      padding: '24px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <span style={{
        fontFamily: 'var(--mono)',
        fontWeight: 700,
        fontSize: '15px',
        letterSpacing: '0.08em',
        color: 'var(--accent)',
      }}>
        wtvr
      </span>

      <small style={{
        fontSize: '13px',
        color: 'var(--text)',
      }}>
        &copy; {new Date().getFullYear()} wtvr. All rights reserved.
      </small>
    </footer>
  )
}

export default Footer
