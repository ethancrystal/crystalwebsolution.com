export default function Layout({ children, columns = 1, className = '' }) {
  const colClass = `mkt-layout mkt-layout--${columns}`;
  return <div className={`${colClass} ${className}`}>{children}</div>;
}