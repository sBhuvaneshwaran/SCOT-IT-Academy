import React from "react";

/* =========================================================
   PANEL
========================================================= */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <h3>{title}</h3>

          {subtitle &&
            (typeof subtitle === "string" ? (
              <p>{subtitle}</p>
            ) : (
              <div style={{ marginTop: "5px" }}>
                {subtitle}
              </div>
            ))}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}


/* =========================================================
   BADGE
========================================================= */

export function Badge({ status }) {
  const cleanStatus = String(status || "").trim();

  /*
    Convert status into CSS class.

    Examples:

    Completed  -> completed
    Positive   -> positive
    Pending    -> pending
    In Progress -> in-progress
    Not Started -> not-started
  */

  const statusClass = cleanStatus
    .toLowerCase()
    .replace(/\s+/g, "-");

  return (
    <span className={`badge ${statusClass}`}>
      {cleanStatus || "-"}
    </span>
  );
}


/* =========================================================
   STATS
========================================================= */

export function Stats({ items }) {
  return (
    <div className="stats">
      {items.map((x, i) => (
        <div className="stat-card" key={i}>
          <div className="stat-main">

            <div className="stat-label-row">

              <div
                className={`stat-icon ${
                  x.color || "blue"
                }`}
              >
                {x.icon}
              </div>

              <div className="stat-meta">
                <span>{x.label}</span>

                {x.sub && (
                  <small>{x.sub}</small>
                )}
              </div>

            </div>

            <h2>{x.value}</h2>

          </div>

          {x.action && (
            <div className="stat-action">
              {x.action}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


/* =========================================================
   EMPTY
========================================================= */

export function Empty({
  text = "No data available",
}) {
  return (
    <div className="empty">
      {text}
    </div>
  );
}


/* =========================================================
   PAGINATION
========================================================= */

export function Pagination({
  page,
  setPage,
  total,
  perPage = 5,
}) {
  const pages = Math.max(
    1,
    Math.ceil(total / perPage)
  );

  if (total <= perPage) {
    return null;
  }

  return (
    <div className="pagination">

      <button
        className="secondary small"
        disabled={page === 1}
        onClick={() =>
          setPage(page - 1)
        }
      >
        Previous
      </button>

      <span>
        Page {page} of {pages}
      </span>

      <button
        className="secondary small"
        disabled={page === pages}
        onClick={() =>
          setPage(page + 1)
        }
      >
        Next
      </button>

    </div>
  );
}
// Keep one table for desktop and mobile so both views expose the same actions.
function tableText(node) {
  return React.Children.toArray(node).map(child =>
    React.isValidElement(child) ? tableText(child.props.children) : String(child)
  ).join(" ").trim();
}

export function ResponsiveTable({ children, className = "", ...props }) {
  const sections = React.Children.toArray(children);
  const head = sections.find(section => section.type === "thead");
  const headerRow = React.Children.toArray(head?.props.children)[0];
  const labels = React.Children.toArray(headerRow?.props.children).map(cell => tableText(cell.props.children));

  return <table {...props} role="table" className={`responsive-table ${className}`}>
    {sections.map(section => {
      if (section.type !== "tbody") return section;
      return React.cloneElement(section, { role: "rowgroup" }, React.Children.map(section.props.children, row => {
        if (!React.isValidElement(row) || row.type !== "tr") return row;
        return React.cloneElement(row, { role: "row" }, React.Children.map(row.props.children, (cell, index) => {
          if (!React.isValidElement(cell) || cell.type !== "td") return cell;
          const spanning = Number(cell.props.colSpan || 1) > 1;
          return React.cloneElement(cell, {
            role: "cell",
            className: `${cell.props.className || ""} ${spanning ? "mobile-full-cell" : ""}`,
          }, <>
            {!spanning && <span className="mobile-cell-label" aria-hidden="true">{labels[index]}</span>}
            <div className="cell-value">{cell.props.children}</div>
          </>);
        }));
      }));
    })}
  </table>;
}
