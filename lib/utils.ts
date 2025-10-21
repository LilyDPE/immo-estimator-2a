export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  
  if (diffMonths === 0) return 'Ce mois-ci';
  if (diffMonths === 1) return 'Il y a 1 mois';
  if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
  
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears === 1) return 'Il y a 1 an';
  return `Il y a ${diffYears} ans`;
}
