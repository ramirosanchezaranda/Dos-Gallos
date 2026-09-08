interface Props {
  title: string
  action?: React.ReactNode
}
export function PageHeader({ title, action }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-verde-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <h1 className="text-lg font-bold tracking-wide">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  )
}
