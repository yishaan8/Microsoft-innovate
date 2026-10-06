export function formatCurrency(amount: number, currency = 'INR'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getRiskScoreBadge(score: number): { label: string; className: string } {
  if (score >= 0.8) {
    return { label: `CRITICAL (${(score * 100).toFixed(0)}%)`, className: 'bg-red-100 text-red-800 border-red-200' };
  }
  if (score >= 0.6) {
    return { label: `HIGH (${(score * 100).toFixed(0)}%)`, className: 'bg-orange-100 text-orange-800 border-orange-200' };
  }
  if (score >= 0.3) {
    return { label: `MEDIUM (${(score * 100).toFixed(0)}%)`, className: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  return { label: `LOW (${(score * 100).toFixed(0)}%)`, className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
}
