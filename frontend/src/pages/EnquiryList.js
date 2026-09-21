import React, { useEffect, useMemo, useState } from "react";
import { enquiryApi } from "../services/api";
import { Panel, Badge, Pagination } from "../components/Ui";

/* =========================================================
   DEFAULT FORM
========================================================= */

const emptyForm = {
  candidate_name: "",
  mobile: "",
  city: "",
  type: "",
  branch: "",
  category: "",
  course: "",
  admin: "",
  comments: "",
  next_followup_date: "",
  status: "Pending",
};

/* =========================================================
   DATE HELPERS
   IMPORTANT:
   <input type="date"> ONLY accepts YYYY-MM-DD
========================================================= */

function normalizeDateForInput(value) {
  if (!value) return "";

  const str = String(value).trim();

  if (!str) return "";

  // Already correct
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // ISO:
  // 2026-09-04T18:30:00.000Z
  // 2026-09-04T00:00:00
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.substring(0, 10);
  }

  // MySQL datetime:
  // 2026-09-04 18:30:00
  if (/^\d{4}-\d{2}-\d{2}\s/.test(str)) {
    return str.substring(0, 10);
  }

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [day, month, year] = str.split("-");
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split("/");
    return `${year}-${month}-${day}`;
  }

  return "";
}

/* =========================================================
   NORMALIZE ENQUIRY
========================================================= */

function normalize(row = {}) {
  return {
    ...row,

    id: row.id,

    name:
      row.name ||
      row.candidate_name ||
      "",

    candidate_name:
      row.candidate_name ||
      row.name ||
      "",

    mobile:
      row.mobile ||
      row.mobile_no ||
      "",

    city:
      row.city ||
      "",

    education:
      row.type ||
      row.education ||
      row.degree ||
      "",

    type:
      row.type ||
      row.education ||
      row.degree ||
      "",

    branch:
      row.branch ||
      "",

    category:
      row.category ||
      "",

    course:
      row.course ||
      "",

    admin:
      row.admin ||
      "",

    comments:
      row.comments ||
      "",

    /*
      IMPORTANT:
      Support all possible backend names.
    */
    next_followup_date: normalizeDateForInput(
      row.next_followup_date ??
        row.nextFollowUpDate ??
        row.next_follow_up_date ??
        row.date ??
        ""
    ),

    date: normalizeDateForInput(
      row.next_followup_date ??
        row.nextFollowUpDate ??
        row.next_follow_up_date ??
        row.date ??
        ""
    ),

    status:
      row.status ||
      row.final_status ||
      row.finalStatus ||
      "Pending",

    referred_by:
      row.referred_by ||
      "",
  };
}

/* =========================================================
   FORM BUILDER
========================================================= */

function enquiryToForm(row = {}) {
  const normalized = normalize(row);

  return {
    ...emptyForm,

    candidate_name:
      normalized.candidate_name,

    mobile:
      normalized.mobile,

    city:
      normalized.city,

    type:
      normalized.type,

    branch:
      normalized.branch,

    category:
      normalized.category,

    course:
      normalized.course,

    admin:
      normalized.admin,

    comments:
      normalized.comments,

    next_followup_date:
      normalizeDateForInput(
        normalized.next_followup_date
      ),

    status:
      normalized.status || "Pending",
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function EnquiryList() {
  const [rows, setRows] = useState([]);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null);

  const [form, setForm] = useState({
    ...emptyForm,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const ITEMS_PER_PAGE = 10;

  /* =======================================================
     LOAD ENQUIRIES
  ======================================================= */

  async function loadEnquiries() {
    setLoading(true);
    setError("");

    try {
      const response = await enquiryApi.list();

      const data =
        response?.data?.results ||
        response?.data ||
        [];

      setRows(
        Array.isArray(data)
          ? data.map(normalize)
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load enquiries:",
        err
      );

      setRows([]);

      setError(
        "Unable to load enquiries. Please check the API connection."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnquiries();
  }, []);

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const types = [
    "Experience",
    "Students",
    "Freshers",
    "Experience in Non IT",
    "Experience in IT",
    "Career Gap",
  ];

  const categories = useMemo(() => {
    return [
      ...new Set(
        rows
          .map((row) => row.category)
          .filter(Boolean)
      ),
    ].sort();
  }, [rows]);

  const statuses = useMemo(() => {
    return [
      ...new Set(
        rows
          .map((row) => row.status)
          .filter(Boolean)
      ),
    ].sort();
  }, [rows]);

  /* =======================================================
     FILTER
  ======================================================= */

  const allFiltered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        `${row.name || ""} ${row.mobile || ""}`
          .toLowerCase()
          .includes(search);

      const matchesType =
        !typeFilter ||
        row.type === typeFilter;

      const matchesCategory =
        !category ||
        row.category === category;

      const matchesStatus =
        !status ||
        row.status === status;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    rows,
    q,
    typeFilter,
    category,
    status,
  ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      allFiltered.length / ITEMS_PER_PAGE
    )
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filtered = useMemo(() => {
    const start =
      (page - 1) * ITEMS_PER_PAGE;

    return allFiltered.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [
    allFiltered,
    page,
  ]);

  /* =======================================================
     SEARCH / FILTER CHANGE
  ======================================================= */

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  /* =======================================================
     VIEW
  ======================================================= */

  async function openView(row) {
    setMessage("");
    setError("");

    try {
      const response =
        await enquiryApi.detail(row.id);

      const detail = normalize({
        ...row,
        ...(response?.data || {}),
      });

      setModal({
        type: "view",
        row: detail,
      });
    } catch (err) {
      console.error(
        "View enquiry failed:",
        err
      );

      setModal({
        type: "view",
        row: normalize(row),
      });
    }
  }

  /* =======================================================
     EDIT
  ======================================================= */

  async function openEdit(row) {
    setMessage("");
    setError("");

    /*
      First use the row date.
      This means even if the detail API fails,
      the date can still appear.
    */
    let editData = normalize(row);

    try {
      const response =
        await enquiryApi.detail(row.id);

      editData = normalize({
        ...row,
        ...(response?.data || {}),
      });
    } catch (err) {
      console.warn(
        "Could not load enquiry detail. Using table data.",
        err
      );
    }

    const editForm =
      enquiryToForm(editData);

    /*
      DEBUG:
      Check browser console.
      This should print:
      next_followup_date: "2026-09-04"
    */
    // console.log(
    //   "EDIT ENQUIRY DATA:",
    //   editData
    // );

    // console.log(
    //   "EDIT FORM:",
    //   editForm
    // );

    setForm(editForm);

    setModal({
      type: "edit",
      row: editData,
    });
  }

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  function change(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "next_followup_date"
          ? normalizeDateForInput(value)
          : value,
    }));
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function remove(row) {
    const confirmed =
      window.confirm(
        `Delete the enquiry for ${row.name}?`
      );

    if (!confirmed) return;

    try {
      await enquiryApi.remove(row.id);

      setRows((previous) =>
        previous.filter(
          (item) =>
            item.id !== row.id
        )
      );

      if (
        filtered.length === 1 &&
        page > 1
      ) {
        setPage(page - 1);
      }
    } catch (err) {
      console.error(
        "Delete enquiry failed:",
        err
      );

      setError(
        "Unable to delete enquiry."
      );
    }
  }

  /* =======================================================
     SAVE / UPDATE
  ======================================================= */

  async function save(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    /*
      IMPORTANT:
      Force date to YYYY-MM-DD before sending.
    */
    const payload = {
      ...form,

      next_followup_date:
        normalizeDateForInput(
          form.next_followup_date
        ),
    };

    // console.log(
    //   "UPDATE ENQUIRY PAYLOAD:",
    //   payload
    // );

    try {
      const response =
        await enquiryApi.update(
          modal.row.id,
          payload
        );

      const updated =
        normalize(
          response?.data || {
            ...modal.row,
            ...payload,
          }
        );

      setRows((previous) =>
        previous.map((row) =>
          row.id === modal.row.id
            ? normalize({
                ...row,
                ...updated,
                ...payload,

                name:
                  payload.candidate_name,

                education:
                  payload.type,

                type:
                  payload.type,

                date:
                  payload.next_followup_date,
              })
            : row
        )
      );

      /*
        Keep edit modal open and show
        updated value.
      */
      setForm(
        enquiryToForm(updated)
      );

      setModal((previous) => ({
        ...previous,
        row: updated,
      }));

      setMessage(
        "Enquiry updated successfully."
      );
    } catch (err) {
      console.error(
        "Enquiry update failed:",
        err
      );

      const apiMessage =
        err?.response?.data?.message;

      setError(
        apiMessage ||
          "Unable to update enquiry. Please check the API connection."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  function resetFilters() {
    setQ("");
    setTypeFilter("");
    setCategory("");
    setStatus("");
    setPage(1);
  }

  /* =======================================================
     EXPORT TO EXCEL
  ======================================================= */

  function exportToExcel() {
    // All rows (not just current page)
    const data = rows;

    if (!data || data.length === 0) {
      alert("No enquiry data to export.");
      return;
    }

    // Column headers and their data keys
    const columns = [
      { header: "S.No",             key: null },
      { header: "Candidate Name",   key: "candidate_name" },
      { header: "Mobile",           key: "mobile" },
      { header: "City",             key: "city" },
      { header: "Type",             key: "type" },
      { header: "Category",         key: "category" },
      { header: "Course",           key: "course" },
      { header: "Admin",            key: "admin" },
      { header: "Enquiry Date",     key: "enquiry_date" },
      { header: "Follow-up Date",   key: "next_followup_date" },
      { header: "Status",           key: "status" },
      { header: "Referred By",      key: "referred_by" },
      { header: "Comments",         key: "comments" },
    ];

    // Escape a cell value for CSV
    function csvCell(value) {
      const str = String(value ?? "").trim();
      // Wrap in quotes if value contains comma, newline or quote
      if (
        str.includes(",") ||
        str.includes("\n") ||
        str.includes('"')
      ) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    // Build header row
    const headerRow = columns
      .map((col) => csvCell(col.header))
      .join(",");

    // Build data rows
    const dataRows = data.map((row, index) => {
      return columns
        .map((col) => {
          if (col.key === null) {
            // S.No column
            return csvCell(index + 1);
          }
          return csvCell(row[col.key]);
        })
        .join(",");
    });

    // Combine all rows
    const csvContent =
      "\uFEFF" + // BOM for Excel UTF-8
      [headerRow, ...dataRows].join("\r\n");

    // Create download
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    link.href = url;
    link.setAttribute(
      "download",
      `Enquiries_${dateStr}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Panel
        title="All Enquiries"
        subtitle="Manage and track all candidate enquiries"
        action={
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary"
              onClick={exportToExcel}
              title="Export all enquiries to Excel"
              style={{ whiteSpace: "nowrap" }}
            >
              ⬇ Export Excel
            </button>

            <a
              className="primary button-link"
              href="/add-enquiry"
            >
              + Add Enquiry
            </a>
          </div>
        }
      >
        {/* ===============================================
            FILTERS
        =============================================== */}

        <div className="filters">
          <input
            type="text"
            placeholder="Search candidate / mobile..."
            value={q}
            onChange={(e) =>
              updateFilter(
                setQ,
                e.target.value
              )
            }
          />

          <select
            value={typeFilter}
            onChange={(e) =>
              updateFilter(
                setTypeFilter,
                e.target.value
              )
            }
          >
            <option value="">
              All Types
            </option>

            {types.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) =>
              updateFilter(
                setCategory,
                e.target.value
              )
            }
          >
            <option value="">
              All Categories
            </option>

            {categories.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) =>
              updateFilter(
                setStatus,
                e.target.value
              )
            }
          >
            <option value="">
              All Status
            </option>

            {statuses.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          {(q ||
            typeFilter ||
            category ||
            status) && (
            <button
              type="button"
              className="secondary"
              onClick={resetFilters}
            >
              Clear
            </button>
          )}
        </div>

        {/* ===============================================
            ERROR
        =============================================== */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* ===============================================
            TABLE
        =============================================== */}

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "#",
                  "Candidate",
                  "Mobile",
                  "City",
                  "Type",
                  "Category",
                  "Course",
                  "Admin",
                  "Follow-up",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="11"
                    style={{
                      textAlign:
                        "center",
                      padding: "30px",
                    }}
                  >
                    Loading enquiries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="11"
                    style={{
                      textAlign:
                        "center",
                      padding: "30px",
                    }}
                  >
                    No enquiries found.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                  >
                    <td>
                      {row.id}
                    </td>

                    <td>
                      <strong>
                        {row.name}
                      </strong>
                    </td>

                    <td>
                      {row.mobile}
                    </td>

                    <td>
                      {row.city}
                    </td>

                    <td>
                      {row.type}
                    </td>

                    <td>
                      {row.category}
                    </td>

                    <td>
                      {row.course}
                    </td>

                    <td>
                      {row.admin}
                    </td>

                    <td>
                      {normalizeDateForInput(
                        row.next_followup_date ||
                          row.date
                      ) || "-"}
                    </td>

                    <td>
                      <Badge
                        status={
                          row.status
                        }
                      />
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="icon-btn"
                          aria-label={`View ${row.name}`}
                          title="View"
                          onClick={() =>
                            openView(row)
                          }
                        >
                          👁
                        </button>

                        <button
                          className="icon-btn"
                          aria-label={`Edit ${row.name}`}
                          title="Edit"
                          onClick={() =>
                            openEdit(row)
                          }
                        >
                          ✎
                        </button>

                        <button
                          className="icon-btn delete-btn"
                          aria-label={`Delete ${row.name}`}
                          title="Delete"
                          onClick={() =>
                            remove(row)
                          }
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===============================================
            PAGINATION
        =============================================== */}

        <Pagination
          page={page}
          setPage={setPage}
          total={allFiltered.length}
        />

        {/* ===============================================
            VIEW MODAL
        =============================================== */}

        {modal?.type === "view" && (
          <div
            className="modal-backdrop"
            onClick={() =>
              setModal(null)
            }
          >
            <div
              className="modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <h3>
                    {modal.row.name}
                  </h3>

                  <p>
                    Previous follow-up
                    details
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setModal(null)
                  }
                >
                  X
                </button>
              </div>

              <div className="detail-grid">
                <div>
                  <small>
                    Mobile
                  </small>
                  <strong>
                    {
                      modal.row
                        .mobile
                    }
                  </strong>
                </div>

                <div>
                  <small>
                    Status
                  </small>
                  <Badge
                    status={
                      modal.row
                        .status
                    }
                  />
                </div>

                <div>
                  <small>
                    Follow-up Date
                  </small>
                  <strong>
                    {normalizeDateForInput(
                      modal.row
                        .next_followup_date ||
                        modal.row.date
                    ) ||
                      "Not scheduled"}
                  </strong>
                </div>

                <div>
                  <small>
                    Course
                  </small>
                  <strong>
                    {
                      modal.row
                        .course
                    }
                  </strong>
                </div>
              </div>

              <div className="followup-note">
                {modal.row
                  .comments ||
                  "No previous follow-up discussion recorded."}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================
            EDIT MODAL
        =============================================== */}

        {modal?.type === "edit" && (
          <div
            className="modal-backdrop"
            onClick={() =>
              setModal(null)
            }
          >
            <form
              className="modal edit-modal"
              onSubmit={save}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <h3>
                    Edit Enquiry
                  </h3>

                  <p>
                    Update candidate
                    and follow-up
                    information
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() =>
                    setModal(null)
                  }
                >
                  X
                </button>
              </div>

              <div className="form-grid">
                {[
                  [
                    "candidate_name",
                    "Candidate Name",
                  ],
                  [
                    "mobile",
                    "Mobile Number",
                  ],
                  [
                    "city",
                    "City / Place",
                  ],
                  [
                    "branch",
                    "Branch",
                  ],
                  [
                    "category",
                    "Category",
                  ],
                  [
                    "course",
                    "Course",
                  ],
                  [
                    "admin",
                    "Admin",
                  ],
                ].map(
                  ([name, label]) => (
                    <div
                      className="form-group"
                      key={name}
                    >
                      <label>
                        {label}
                      </label>

                      <input
                        type="text"
                        name={name}
                        value={
                          form[name] || ""
                        }
                        onChange={change}
                      />
                    </div>
                  )
                )}

                {/* ========================================
                    TYPE DROPDOWN
                ======================================== */}

                <div className="form-group">
                  <label>Type</label>

                  <select
                    name="type"
                    value={form.type || ""}
                    onChange={change}
                  >
                    <option value="">
                      Select Type
                    </option>
                    {[
                      "Experience",
                      "Students",
                      "Freshers",
                      "Experience in Non IT",
                      "Experience in IT",
                      "Career Gap",
                    ].map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </div>


                {/* ========================================
                    FOLLOW-UP DATE
                ======================================== */}

                <div className="form-group">
                  <label>
                    Next Follow-up Date
                  </label>

                  <input
                    type="date"
                    name="next_followup_date"
                    value={
                      normalizeDateForInput(
                        form.next_followup_date
                      )
                    }
                    onChange={change}
                  />

                  {/* Debug display - remove if not needed */}
                  {form.next_followup_date && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity: 0.7,
                      }}
                    >
                      Selected:{" "}
                      {
                        form.next_followup_date
                      }
                    </small>
                  )}
                </div>

                {/* ========================================
                    STATUS
                ======================================== */}

                <div className="form-group">
                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      form.status ||
                      "Pending"
                    }
                    onChange={change}
                  >
                    {[
                      "Positive",
                      "Pending",
                      "Low",
                      "Hold",
                      "Negative",
                      "Joined",
                    ].map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* ========================================
                    COMMENTS
                ======================================== */}

                <div className="form-group full">
                  <label>
                    Comments / Last
                    Discussion
                  </label>

                  <textarea
                    name="comments"
                    value={
                      form.comments ||
                      ""
                    }
                    onChange={change}
                    rows="4"
                  />
                </div>
              </div>

              {/* =========================================
                  SUCCESS / ERROR
              ========================================= */}

              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* =========================================
                  ACTIONS
              ========================================= */}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setModal(null)
                  }
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={saving}
                >
                  {saving
                    ? "Updating..."
                    : "Update Enquiry"}
                </button>
              </div>
            </form>
          </div>
        )}
      </Panel>
    </>
  );
}