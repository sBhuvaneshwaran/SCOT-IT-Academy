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