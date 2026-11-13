import React from 'react';

export interface TableColumn<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  isRowHeader?: boolean;
}

export interface TableProps<T> {
  caption: string;
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  className?: string;
  summary?: string;
}

/**
 * Accessible Data Table implementing WCAG 2.2 Rule 24:
 * Mandatory caption, scope attributes (col / row), structured thead/tbody, and keyboard scroll support.
 */
export function Table<T>({
  caption,
  columns,
  data,
  keyExtractor,
  className = '',
  summary,
}: TableProps<T>) {
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${caption} scrollable view`}
      className={`overflow-x-auto rounded-lg border border-[var(--color-border)] focus:outline focus:outline-3 focus:outline-[var(--color-focus)] focus:outline-offset-2 ${className}`}
    >
      <table className="w-full border-collapse text-left text-[var(--font-size-base)]">
        <caption className="p-3 text-left font-bold text-[var(--color-text)] bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          {caption}
          {summary && <span className="block text-sm font-normal text-[var(--color-text-muted)] mt-1">{summary}</span>}
        </caption>
        <thead className="bg-[var(--color-surface)] border-b-2 border-[var(--color-border)]">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                scope="col"
                className="px-4 py-3 font-bold text-[var(--color-text)]"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-[var(--color-text-muted)]"
              >
                No data available in this table.
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row, rowIndex)}
                className="hover:bg-[var(--color-surface)]/50 transition-colors"
              >
                {columns.map((col, colIndex) => {
                  const content =
                    typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : col.accessor
                      ? (row[col.accessor] as unknown as React.ReactNode)
                      : null;

                  if (col.isRowHeader) {
                    return (
                      <th
                        key={colIndex}
                        scope="row"
                        className="px-4 py-3 font-semibold text-[var(--color-text)] whitespace-nowrap"
                      >
                        {content}
                      </th>
                    );
                  }

                  return (
                    <td
                      key={colIndex}
                      className="px-4 py-3 text-[var(--color-text)]"
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
