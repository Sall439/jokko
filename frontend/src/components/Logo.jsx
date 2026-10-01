import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

export function Logo({ vers = '/', className, clair = false }) {
  return (
    <Link
      to={vers}
      className={cn(
        'inline-flex items-center gap-2 rounded-bouton font-display text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        clair ? 'text-carte' : 'text-primary-dark',
        className,
      )}
    >
      <img src="/favicon.svg" alt="" width={28} height={28} className="h-7 w-7" />
      <span>
        Jokko<span className={clair ? 'text-primary-soft' : 'text-primary'}>Dentiste</span>
      </span>
    </Link>
  )
}
