import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  enquiryApi,
  referralApi,
} from "../services/api";

import {
  Panel,
  Badge,
  Pagination,
} from "../components/Ui";

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
  referred_by: "",
  admin: "",
  comments: "",
  next_followup_date: "",
  status: "Pending",
};

/* =========================================================
   DATE HELPERS
========================================================= */

function normalizeDateForInput(value) {
  if (!value) return "";

  const str = String(value).trim();

  if (!str) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.substring(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}\s/.test(str)) {
    return str.substring(0, 10);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [day, month, year] =
      str.split("-");

    return `${year}-${month}-${day}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] =
      str.split("/");

    return `${year}-${month}-${day}`;
  }

  return "";
}

/* =========================================================
   TYPE CACHE
========================================================= */

const TYPE_CACHE_KEY =
  "scot_it_enquiry_types";

function getAllCachedTypes() {
  try {
    return JSON.parse(
      localStorage.getItem(
        TYPE_CACHE_KEY
      ) || "{}"
    );
  } catch {
    return {};
  }
}

function getCachedType(id) {
  if (!id) return "";

  return (
    getAllCachedTypes()[
      String(id)
    ] || ""
  );
}

function setCachedType(id, type) {
  if (!id) return;

  const cache =
    getAllCachedTypes();

  if (
    type &&
    String(type).trim()
  ) {
    cache[String(id)] =
      String(type).trim();
  } else {
    delete cache[String(id)];
  }

  localStorage.setItem(
    TYPE_CACHE_KEY,
    JSON.stringify(cache)
  );
}

/* =========================================================
   NORMALIZE ENQUIRY
========================================================= */

function normalize(row = {}) {
  return {
    ...row,

    // Keep the real database ID.
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
      getCachedType(row.id) ||
      row.education ||
      row.degree ||
      "",

    type:
      row.type ||
      getCachedType(row.id) ||
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

    next_followup_date:
      normalizeDateForInput(
        row.next_followup_date ??
          row.nextFollowUpDate ??
          row.next_follow_up_date ??
          row.date ??
          ""
      ),

    date:
      normalizeDateForInput(
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
  const normalized =
    normalize(row);

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

    referred_by:
      normalized.referred_by,

    admin:
      normalized.admin,

    comments:
      normalized.comments,

    next_followup_date:
      normalizeDateForInput(
        normalized.next_followup_date
      ),

    status:
      normalized.status ||
      "Pending",
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function EnquiryList() {
  const [rows, setRows] =
    useState([]);

  const [q, setQ] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [modal, setModal] =
    useState(null);

  const [form, setForm] =
    useState({
      ...emptyForm,
    });

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * =======================================================
   * REFFERED BY MASTER DATA
   * =======================================================
   *
   * These values come from the Referred By page/database.
   * They are NOT taken from the enquiries table.
   */

  const [referrals, setReferrals] =
    useState([]);

  const [referralsLoading, setReferralsLoading] =
    useState(false);

  const ITEMS_PER_PAGE = 10;

  /* =======================================================
     LOAD ENQUIRIES
  ======================================================= */

  async function loadEnquiries() {
    setLoading(true);
    setError("");

    try {
      const response =
        await enquiryApi.list();

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

  /* =======================================================
     LOAD REFERRED BY MASTER DATA
  ======================================================= */

  async function loadReferrals() {
    setReferralsLoading(true);

    try {
      const response =
        await referralApi.list();

      const data =
        response?.data?.results ||
        response?.data ||
        [];

      const cleanData =
        Array.isArray(data)
          ? data
              .map((item) => ({
                id: item.id,
                name: String(
                  item.name || ""
                ).trim(),
              }))
              .filter(
                (item) =>
                  item.name
              )
          : [];

      /*
       * Sort alphabetically by name.
       */
      cleanData.sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

      setReferrals(cleanData);
    } catch (err) {
      console.error(
        "Failed to load Referred By data:",
        err
      );

      setReferrals([]);
    } finally {
      setReferralsLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadEnquiries();
    loadReferrals();
  }, []);

  /* =======================================================
     REFRESH REFERRED BY WHEN PAGE GETS FOCUS
  ======================================================= */

  useEffect(() => {
    function handleWindowFocus() {
      loadReferrals();
    }

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleWindowFocus
      );
    };
  }, []);

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

const types = useMemo(() => {
  const values = rows
    .map((row) => String(row.type || "").trim())
    .filter(Boolean);

  return [...new Set(values)].sort((a, b) =>
    a.localeCompare(b)
  );
}, [rows]);

  const categories = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(
            (row) =>
              row.category
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [rows]);

  const statuses = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(
            (row) =>
              row.status
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [rows]);

  /* =======================================================
     FILTER
  ======================================================= */

  const allFiltered =
    useMemo(() => {
      const search =
        q.trim().toLowerCase();

      return rows.filter(
        (row) => {
          const matchesSearch =
            !search ||
            `${row.name || ""} ${
              row.mobile || ""
            }`
              .toLowerCase()
              .includes(search);

          const matchesType =
            !typeFilter ||
            row.type === typeFilter;

          const matchesCategory =
            !category ||
            row.category ===
              category;

          const matchesStatus =
            !status ||
            row.status === status;

          return (
            matchesSearch &&
            matchesType &&
            matchesCategory &&
            matchesStatus
          );
        }
      );
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

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        allFiltered.length /
          ITEMS_PER_PAGE
      )
    );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filtered =
    useMemo(() => {
      const sorted = [
        ...allFiltered,
      ].sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id)
      );

      const start =
        (page - 1) *
        ITEMS_PER_PAGE;

      return sorted.slice(
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

  function updateFilter(
    setter,
    value
  ) {
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
        await enquiryApi.detail(
          row.id
        );

      const detail =
        normalize({
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
     * Always load the latest Referred By
     * master list before opening edit.
     */
    await loadReferrals();

    let editData =
      normalize(row);

    try {
      const response =
        await enquiryApi.detail(
          row.id
        );

      editData =
        normalize({
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
      enquiryToForm(
        editData
      );

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

    setForm(
      (previous) => ({
        ...previous,

        [name]:
          name ===
          "next_followup_date"
            ? normalizeDateForInput(
                value
              )
            : value,
      })
    );
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
      await enquiryApi.remove(
        row.id
      );

      setRows(
        (previous) =>
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

      setMessage(
        "Enquiry deleted successfully."
      );
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

    const payload = {
      ...form,

      candidate_name:
        String(
          form.candidate_name ||
            ""
        ).trim(),

      mobile:
        String(
          form.mobile || ""
        ).trim(),

      city:
        String(
          form.city || ""
        ).trim(),

      type:
        String(
          form.type || ""
        ).trim(),

      branch:
        String(
          form.branch || ""
        ).trim(),

      category:
        String(
          form.category || ""
        ).trim(),

      course:
        String(
          form.course || ""
        ).trim(),

      /*
       * Referred By selected from
       * master Referred By dropdown.
       */
      referred_by:
        String(
          form.referred_by || ""
        ).trim(),

      next_followup_date:
        normalizeDateForInput(
          form.next_followup_date
        ),
    };

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

      if (payload.type) {
        setCachedType(
          modal.row.id,
          payload.type
        );
      }

      setRows(
        (previous) =>
          previous.map(
            (row) =>
              row.id ===
              modal.row.id
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

                    referred_by:
                      payload.referred_by,

                    date:
                      payload.next_followup_date,
                  })
                : row
          )
      );

      const finalUpdated =
        normalize({
          ...modal.row,
          ...updated,
          ...payload,
        });

      setForm(
        enquiryToForm(
          finalUpdated
        )
      );

      setModal(
        (previous) => ({
          ...previous,
          row: finalUpdated,
        })
      );

      setMessage(
        "Enquiry updated successfully."
      );
    } catch (err) {
      console.error(
        "Enquiry update failed:",
        err
      );

      const apiMessage =
        err?.response?.data
          ?.message;

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
     EXPORT TO EXCEL / CSV
  ======================================================= */

  function exportToExcel() {
    const data = rows;

    if (
      !data ||
      data.length === 0
    ) {
      alert(
        "No enquiry data to export."
      );

      return;
    }

    const columns = [
      {
        header: "S.No",
        key: null,
      },
      {
        header:
          "Candidate Name",
        key: "candidate_name",
      },
      {
        header: "Mobile",
        key: "mobile",
      },
      {
        header: "City",
        key: "city",
      },
      {
        header: "Type",
        key: "type",
      },
      {
        header: "Category",
        key: "category",
      },
      {
        header: "Course",
        key: "course",
      },
      {
        header: "Referred By",
        key: "referred_by",
      },
      {
        header: "Enquiry Date",
        key: "enquiry_date",
      },
      {
        header:
          "Follow-up Date",
        key: "next_followup_date",
      },
      {
        header: "Status",
        key: "status",
      },
      {
        header: "Comments",
        key: "comments",
      },
    ];

    function csvCell(value) {
      const str =
        String(
          value ?? ""
        ).trim();

      if (
        str.includes(",") ||
        str.includes("\n") ||
        str.includes('"')
      ) {
        return `"${str.replace(
          /"/g,
          '""'
        )}"`;
      }

      return str;
    }

    const headerRow =
      columns
        .map((col) =>
          csvCell(
            col.header
          )
        )
        .join(",");

    const dataRows =
      data.map(
        (row, index) => {
          return columns
            .map((col) => {
              if (
                col.key === null
              ) {
                return csvCell(
                  index + 1
                );
              }

              return csvCell(
                row[col.key]
              );
            })
            .join(",");
        }
      );

    const csvContent =
      "\uFEFF" +
      [
        headerRow,
        ...dataRows,
      ].join("\r\n");

    const blob =
      new Blob(
        [csvContent],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    const now =
      new Date();

    const dateStr =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

    link.href = url;

    link.setAttribute(
      "download",
      `Enquiries_${dateStr}.csv`
    );

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
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
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems:
                "center",
              flexWrap:
                "wrap",
            }}
          >
            <button
              type="button"
              className="secondary"
              onClick={
                exportToExcel
              }
              title="Export all enquiries to Excel"
              style={{
                whiteSpace:
                  "nowrap",
              }}
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

        {/* =================================================
            FILTERS
        ================================================= */}

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

            {categories.map(
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

            {statuses.map(
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

          {/* {(q ||
            typeFilter ||
            category ||
            status) && (
            <button
              type="button"
              className="secondary"
              onClick={
                resetFilters
              }
            >
              Clear
            </button>
          )} */}
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {message &&
          !modal && (
            <div className="success-message">
              {message}
            </div>
          )}

        {/* =================================================
            TABLE
        ================================================= */}

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
                  "Referred By",
                  "Follow-up",
                  "Status",
                  "Action",
                ].map(
                  (heading) => (
                    <th
                      key={heading}
                    >
                      {heading}
                    </th>
                  )
                )}
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
                      padding:
                        "30px",
                    }}
                  >
                    Loading enquiries...
                  </td>
                </tr>

              ) : filtered.length ===
                0 ? (

                <tr>
                  <td
                    colSpan="11"
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "30px",
                    }}
                  >
                    No enquiries found.
                  </td>
                </tr>

              ) : (

                filtered.map(
                  (
                    row,
                    index
                  ) => (
                    <tr
                      key={row.id}
                    >

                      <td>
                        {(page - 1) *
                          ITEMS_PER_PAGE +
                          index +
                          1}
                      </td>

                      <td>
                        <strong>
                          {
                            row.name
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          row.mobile
                        }
                      </td>

                      <td>
                        {
                          row.city
                        }
                      </td>

                      <td>
                        {
                          row.type
                        }
                      </td>

                      <td>
                        {
                          row.category
                        }
                      </td>

                      <td>
                        {
                          row.course
                        }
                      </td>

                      <td>
                        {
                          row.referred_by
                        }
                      </td>

                      <td>
                        {normalizeDateForInput(
                          row.next_followup_date ||
                            row.date
                        ) ||
                          "-"}
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
                              openView(
                                row
                              )
                            }
                          >
                            👁
                          </button>

                          <button
                            className="icon-btn"
                            aria-label={`Edit ${row.name}`}
                            title="Edit"
                            onClick={() =>
                              openEdit(
                                row
                              )
                            }
                          >
                            ✎
                          </button>

                          <button
                            className="icon-btn delete-btn"
                            aria-label={`Delete ${row.name}`}
                            title="Delete"
                            onClick={() =>
                              remove(
                                row
                              )
                            }
                          >
                            🗑
                          </button>

                        </div>
                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>
        </div>

        {/* =================================================
            PAGINATION
        ================================================= */}

        <Pagination
          page={page}
          setPage={setPage}
          total={
            allFiltered.length
          }
        />

        {/* =================================================
            VIEW MODAL
        ================================================= */}

        {modal?.type ===
          "view" && (
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
                    {
                      modal.row
                        .name
                    }
                  </h3>

                  <p>
                    Previous follow-up
                    details
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
                    City
                  </small>

                  <strong>
                    {
                      modal.row
                        .city ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <small>
                    Type
                  </small>

                  <strong>
                    {
                      modal.row
                        .type ||
                      "—"
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
                        modal.row
                          .date
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

                <div>
                  <small>
                    Referred By
                  </small>

                  <strong>
                    {
                      modal.row
                        .referred_by ||
                      "—"
                    }
                  </strong>
                </div>

              </div>

              <div className="followup-note">
                {
                  modal.row
                    .comments ||
                  "No previous follow-up discussion recorded."
                }
              </div>

            </div>

          </div>
        )}

        {/* =================================================
            EDIT MODAL
        ================================================= */}

        {modal?.type ===
          "edit" && (
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

                {/* CANDIDATE NAME */}

                <div className="form-group">
                  <label>
                    Candidate Name
                  </label>

                  <input
                    type="text"
                    name="candidate_name"
                    value={
                      form.candidate_name ||
                      ""
                    }
                    onChange={
                      change
                    }
                  />
                </div>

                {/* MOBILE */}

                <div className="form-group">
                  <label>
                    Mobile Number
                  </label>

                  <input
                    type="text"
                    name="mobile"
                    value={
                      form.mobile ||
                      ""
                    }
                    onChange={
                      change
                    }
                  />
                </div>

                {/* CITY */}

                <div className="form-group">
                  <label>
                    City / Place
                  </label>

                  <input
                    type="text"
                    name="city"
                    value={
                      form.city ||
                      ""
                    }
                    onChange={
                      change
                    }
                  />
                </div>

                {/* BRANCH */}

                <div className="form-group">
                  <label>
                    Branch
                  </label>

                  <input
                    type="text"
                    name="branch"
                    value={
                      form.branch ||
                      ""
                    }
                    onChange={
                      change
                    }
                  />
                </div>

                {/* CATEGORY */}

                <div className="form-group">
                  <label>
                    Category
                  </label>

                  <input
                    type="text"
                    name="category"
                    value={
                      form.category ||
                      ""
                    }
                    onChange={
                      change
                    }
                  />
                </div>

                {/* COURSE */}

                <div className="form-group">
                  <label>
                    Course
                  </label>

                  <input
                    type="text"
                    name="course"
                    value={
                      form.course ||
                      ""
                    }
                    onChange={
                      change
                    }
                  />
                </div>

                {/* =================================================
                    REFERRED BY DROPDOWN
                ================================================= */}

                <div className="form-group">

                  <label>
                    Referred By
                  </label>

                  <select
                    name="referred_by"
                    value={
                      form.referred_by ||
                      ""
                    }
                    onChange={
                      change
                    }
                    disabled={
                      referralsLoading
                    }
                  >

                    <option value="">
                      {referralsLoading
                        ? "Loading Referred By..."
                        : "Select Referred By"}
                    </option>

                    {referrals.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.name
                          }
                        >
                          {
                            item.name
                          }
                        </option>
                      )
                    )}

                    {/* 
                      If an existing enquiry has a referred_by
                      value that no longer exists in the master
                      Referred By list, keep the old value here.
                    */}

                    {form.referred_by &&
                      !referrals.some(
                        (item) =>
                          item.name ===
                          form.referred_by
                      ) && (
                        <option
                          value={
                            form.referred_by
                          }
                        >
                          {
                            form.referred_by
                          }
                        </option>
                      )}

                  </select>

                </div>

                {/* TYPE */}

                <div className="form-group">

                  <label>
                    Type
                  </label>

                  <select
                    name="type"
                    value={
                      form.type ||
                      ""
                    }
                    onChange={
                      change
                    }
                  >

                    <option value="">
                      Select Type
                    </option>

                    {types.map(
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

                {/* FOLLOW-UP DATE */}

                <div className="form-group">

                  <label>
                    Next Follow-up Date
                  </label>

                  <input
                    type="date"
                    name="next_followup_date"
                    value={normalizeDateForInput(
                      form.next_followup_date
                    )}
                    onChange={
                      change
                    }
                  />

                  {form.next_followup_date && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity:
                          0.7,
                      }}
                    >
                      Selected:{" "}
                      {
                        form.next_followup_date
                      }
                    </small>
                  )}

                </div>

                {/* STATUS */}

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
                    onChange={
                      change
                    }
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

                {/* COMMENTS */}

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
                    onChange={
                      change
                    }
                    rows="4"
                  />

                </div>

              </div>

              {/* SUCCESS */}

              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}

              {/* ERROR */}

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* ACTIONS */}

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