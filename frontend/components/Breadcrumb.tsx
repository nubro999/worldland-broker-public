interface BreadcrumbProps {
  items: string[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-3 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          {index > 0 && (
            <span className="text-gray-400">›</span>
          )}
          <span className={index === items.length - 1 ? 'text-gray-900 font-semibold' : 'text-gray-600'}>
            {item}
          </span>
        </div>
      ))}
    </nav>
  );
}
