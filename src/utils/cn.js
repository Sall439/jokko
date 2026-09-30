// Concatène des classes CSS en ignorant les valeurs falsy.
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
