export function formatAmount(value: number) {
  return Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Money({
  currency,
  amount,
  className = "",
}: {
  currency: string;
  amount: number;
  className?: string;
}) {
  return (
    <span className={`money ${className}`}>
      {amount < 0 && "-"}
      <span className="money-currency">{currency}</span>
      {formatAmount(amount)}
    </span>
  );
}
