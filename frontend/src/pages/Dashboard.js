import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  enquiryApi,
  categoryApi,
  studentApi,
} from "../services/api";

import {
  Panel,
  Stats,
  Badge,
  Pagination,
} from "../components/Ui";

// ======================================================
// DEFAULT CATEGORIES
// ======================================================

const defaultCategories = [];

// ======================================================
// STATUS HELPER
// ======================================================

function statusOf(row = {}) {
  return String(
    row.status ||
      row.final_status ||
      row.finalStatus ||
      "Pending"
  ).trim();
}

// ======================================================
// UNIQUE KEY HELPER
// ======================================================

function keyOf(row = {}) {
  return (
    row.mobile ||
    row.id ||
    `${row.candidate_name || row.name || ""}-${row.course || ""}`
  );
}

// ======================================================
// CATEGORY HELPER
// ======================================================

function categoryOf(value) {
  const name =
    typeof value === "object"
      ? value?.name
      : value;

  const normalized = String(
    name || "Other"
  ).trim();

  if (
    normalized
      .toLowerCase()
      .includes("data analytics")
  ) {
    return "Data Analytics / DS";
  }

  return normalized || "Other";
}

// ======================================================
// NORMALIZE CATEGORY NAME
// ======================================================

function normalizeCategoryName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// ======================================================
// UNIQUE CATEGORIES
// ======================================================

function uniqueCategories(list = []) {
  const map = new Map();

  list.forEach((item) => {
    const name = categoryOf(item);

    if (!name || name === "Other") {
      return;
    }

    const key =
      normalizeCategoryName(name);

    if (!map.has(key)) {
      map.set(key, name);
    }
  });

  return Array.from(map.values());
}

// ======================================================
// DATE HELPER
// ======================================================

function getDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// ======================================================
// NORMALIZE STUDENT
// ======================================================

function normalizeStudent(student = {}) {
  const paidFee =
    Number(
      student.paidFee ??
        student.paid_fee ??
        student.paid ??
        student.amount_paid ??
        student.payment_amount ??
        0
    ) || 0;

  const balanceFee =
    Number(
      student.balanceFee ??
        student.balance_fee ??
        student.balance ??
        student.remaining_fee ??
        0
    ) || 0;

  const totalFee =
    Number(
      student.totalFee ??
        student.total_fee ??
        student.course_fee ??
        student.total_amount ??
        0
    ) || paidFee + balanceFee;

  const joinDate =
    student.joinDate ||
    student.join_date ||
    student.joiningDate ||
    student.joining_date ||
    student.date ||
    student.created_at ||
    null;

  const paymentDate =
    student.paymentDate ||
    student.payment_date ||
    student.paidDate ||
    student.paid_date ||
    student.feeDate ||
    student.fee_date ||
    student.paymentDateTime ||
    student.payment_datetime ||
    student.created_at ||
    joinDate ||
    null;

  return {
    ...student,

    id: student.id,

    name:
      student.name ||
      student.candidate_name ||
      student.student_name ||
      "",

    mobile:
      student.mobile ||
      student.mobile_no ||
      student.phone ||
      "",

    city:
      student.city || "",

    category:
      student.category ||
      student.category_name ||
      "",

    course:
      student.course ||
      student.course_name ||
      "",

    paidFee,

    balanceFee,

    totalFee,

    joinDate,

    paymentDate,

    status: String(
      student.status ||
        student.final_status ||
        student.finalStatus ||
        "Joined"
    ).trim(),
  };
}

// ======================================================
// CHECK LAST N DAYS
// ======================================================

function isWithinLastDays(
  dateValue,
  days
) {
  const date =
    getDateValue(dateValue);

  if (!date) {
    return false;
  }

  const now = new Date();

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const cutOff =
    new Date(today);

  cutOff.setDate(
    cutOff.getDate() -
      (days - 1)
  );

  return (
    date >= cutOff &&
    date <= now
  );
}

// ======================================================
// DASHBOARD
// ======================================================

export default function Dashboard() {

  // ====================================================
  // STATE
  // ====================================================

  const [rows, setRows] =
    useState([]);

  const [categories, setCategories] =
    useState(defaultCategories);

  const [query, setQuery] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [currentYear, setCurrentYear] =
    useState(
      new Date().getFullYear()
    );

  // ====================================================
  // AUTOMATIC YEAR UPDATE
  // ====================================================

  useEffect(() => {
    const checkYear = () => {
      const year =
        new Date().getFullYear();

      setCurrentYear(
        (previousYear) =>
          previousYear === year
            ? previousYear
            : year
      );
    };

    const timer =
      setInterval(
        checkYear,
        60 * 1000
      );

    return () => {
      clearInterval(timer);
    };
  }, []);

  // ====================================================
  // LOAD DASHBOARD DATA
  // ====================================================

  const loadDashboardData =
    async () => {

      setLoading(true);

      try {

        const [
          enquiryResponse,
          categoryResponse,
          studentResponse,
        ] = await Promise.all([
          enquiryApi.list(),
          categoryApi.list(),
          studentApi.list(),
        ]);

        // ==================================================
        // ENQUIRIES
        // ==================================================

        const enquiryIncoming =
          enquiryResponse?.data
            ?.results ||
          enquiryResponse?.data ||
          [];

        const enquiryList =
          Array.isArray(
            enquiryIncoming
          )
            ? enquiryIncoming
            : [];

        const uniqueEnquiries =
          new Map();

        enquiryList.forEach(
          (row) => {

            uniqueEnquiries.set(
              String(
                keyOf(row)
              ),
              row
            );

          }
        );

        setRows(
          Array.from(
            uniqueEnquiries.values()
          )
        );

        // ==================================================
        // CATEGORIES
        // ==================================================

        const categoryIncoming =
          categoryResponse?.data
            ?.results ||
          categoryResponse?.data ||
          [];

        const categoryNames =
          Array.isArray(
            categoryIncoming
          )
            ? categoryIncoming
                .map(
                  (item) =>
                    typeof item ===
                    "string"
                      ? item
                      : item?.name
                )
                .filter(Boolean)
            : [];

        setCategories(
          uniqueCategories([
            ...defaultCategories,
            ...categoryNames,
          ])
        );

        // ==================================================
        // STUDENTS
        // ==================================================

        const studentIncoming =
          studentResponse?.data
            ?.results ||
          studentResponse?.data ||
          [];

        const studentList =
          Array.isArray(
            studentIncoming
          )
            ? studentIncoming
            : [];

        const uniqueStudents =
          new Map();

        studentList.forEach(
          (student) => {

            const normalized =
              normalizeStudent(
                student
              );

            const key =
              normalized.id ||
              normalized.mobile ||
              `${normalized.name}-${normalized.course}`;

            uniqueStudents.set(
              String(key),
              normalized
            );

          }
        );

        setStudents(
          Array.from(
            uniqueStudents.values()
          )
        );

      } catch (error) {

        console.error(
          "Dashboard data loading error:",
          error
        );

        setRows([]);
        setStudents([]);

      } finally {

        setLoading(false);

      }
    };

  // ====================================================
  // LOAD DASHBOARD
  // ====================================================

  useEffect(() => {
    loadDashboardData();
  }, []);

  // ====================================================
  // ENQUIRY DATA
  // ====================================================

  const currentRows = rows;

  const filtered =
    currentRows.filter(
      (row) => {

        const searchText = `
          ${row.candidate_name || row.name || ""}
          ${row.mobile || ""}
          ${row.city || ""}
        `.toLowerCase();

        const rowStatus =
          statusOf(
            row
          ).toLowerCase();

        const isJoined =
          rowStatus ===
          "joined";

        return (
          searchText.includes(
            query.toLowerCase()
          ) &&
          (!status ||
            rowStatus ===
              status.toLowerCase()) &&
          !isJoined
        );
      }
    );

  // ====================================================
  // PAGINATION
  // ====================================================

  const visibleRows =
    filtered.slice(
      (page - 1) * 5,
      page * 5
    );

  // ====================================================
  // TOTAL ENQUIRIES
  // ====================================================

  const totalEnquiries =
    currentRows.filter(
      (row) =>
        statusOf(
          row
        ).toLowerCase() !==
        "joined"
    ).length;

  // ====================================================
  // ENQUIRY COUNT
  // ====================================================

  const enquiryCount =
    (value) => {

      return currentRows.filter(
        (row) =>
          statusOf(
            row
          ).toLowerCase() ===
          value.toLowerCase()
      ).length;

    };

  // ====================================================
  // STUDENT DATA
  // ====================================================

  const studentEntries =
    useMemo(() => {

      return students.map(
        normalizeStudent
      );

    }, [students]);

  // ====================================================
  // JOINED STUDENTS
  // ====================================================

  const joinedStudents =
    useMemo(() => {

      return studentEntries.filter(
        (student) =>
          String(
            student.status
          )
            .trim()
            .toLowerCase() ===
          "joined"
      );

    }, [studentEntries]);

  // ====================================================
  // DASHBOARD COUNTS
  // ====================================================

  const joinedCount =
    joinedStudents.length;

  const positiveCount =
    enquiryCount(
      "Positive"
    );

  const pendingCount =
    enquiryCount(
      "Pending"
    );

  const negativeCount =
    enquiryCount(
      "Negative"
    );

  // ====================================================
  // JOINED STUDENTS BY CATEGORY
  // ====================================================

  const studentCategories =
    uniqueCategories(
      joinedStudents.map(
        (student) =>
          student.category
      )
    );

  const allChartCategories =
    uniqueCategories([
      ...categories,
      ...studentCategories,
    ]);

  const finalJoinedCounts =
    allChartCategories
      .map(
        (category) => {

          const categoryKey =
            normalizeCategoryName(
              category
            );

          const count =
            joinedStudents.filter(
              (student) =>
                normalizeCategoryName(
                  categoryOf(
                    student.category
                  )
                ) ===
                categoryKey
            ).length;

          return [
            category,
            count,
          ];

        }
      )
      .filter(
        ([, count]) =>
          count > 0
      );

  const maxCount =
    Math.max(
      1,
      ...finalJoinedCounts.map(
        (item) => item[1]
      )
    );

  // ====================================================
  // OVERDUE FOLLOW UPS
  // ====================================================

  const today =
    new Date();

  const allOverdue =
    currentRows.filter(
      (row) => {

        const rowStatus =
          statusOf(
            row
          ).toLowerCase();

        if (
          [
            "joined",
            "negative",
          ].includes(
            rowStatus
          )
        ) {
          return false;
        }

        if (
          !row.next_followup_date
        ) {
          return false;
        }

        const followupDate =
          getDateValue(
            row.next_followup_date
          );

        if (!followupDate) {
          return false;
        }

        return (
          followupDate <
          today
        );
      }
    );

  const overdue =
    allOverdue.slice(
      0,
      4
    );

  // ====================================================
  // GET INCOME DATE
  // ====================================================

  const getStudentIncomeDate =
    (student) => {

      return (
        student.paymentDate ||
        student.joinDate ||
        null
      );

    };

  // ====================================================
  // INCOME BY RANGE
  // ====================================================

  const incomeByRange =
    (days) => {

      return joinedStudents
        .filter(
          (student) =>
            isWithinLastDays(
              getStudentIncomeDate(
                student
              ),
              days
            )
        )
        .reduce(
          (
            sum,
            student
          ) =>
            sum +
            Number(
              student.paidFee ||
                0
            ),
          0
        );

    };

  // ====================================================
  // MONTHLY INCOME
  // ====================================================

  const monthlyIncome =
    joinedStudents
      .filter(
        (student) =>
          isWithinLastDays(
            getStudentIncomeDate(
              student
            ),
            30
          )
      )
      .reduce(
        (
          sum,
          student
        ) =>
          sum +
          Number(
            student.paidFee ||
              0
          ),
        0
      );

  // ====================================================
  // YEARLY INCOME
  // ====================================================

  const yearlyIncome =
    joinedStudents
      .filter(
        (student) => {

          const dateValue =
            getDateValue(
              getStudentIncomeDate(
                student
              )
            );

          if (!dateValue) {
            return false;
          }

          return (
            dateValue.getFullYear() ===
            currentYear
          );

        }
      )
      .reduce(
        (
          sum,
          student
        ) =>
          sum +
          Number(
            student.paidFee ||
              0
          ),
        0
      );

  // ====================================================
  // DOWNLOAD INCOME
  // ====================================================

  const downloadIncome =
    (
      label,
      downloadRows
    ) => {

      const header = [
        "Student Name",
        "Mobile",
        "Join Date",
        "Payment Date",
        "Paid Fee",
      ];

      const csv = [
        header.join(","),
        ...downloadRows.map(
          (row) =>
            [
              row.name,
              row.mobile || "",
              row.joinDate || "",
              row.paymentDate || "",
              row.paidFee || 0,
            ]
              .map(
                (value) =>
                  `"${String(
                    value
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )
              .join(",")
        ),
      ].join("\n");

      const blob =
        new Blob(
          [csv],
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

      link.href = url;

      link.download =
        `${label
          .toLowerCase()
          .replace(
            /\s+/g,
            "-"
          )}.csv`;

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
    };

  // ====================================================
  // LAST 15 DAYS STUDENTS
  // ====================================================

  const last15DaysStudents =
    joinedStudents.filter(
      (student) =>
        isWithinLastDays(
          getStudentIncomeDate(
            student
          ),
          15
        )
    );

  // ====================================================
  // LAST 30 DAYS STUDENTS
  // ====================================================

  const last30DaysStudents =
    joinedStudents.filter(
      (student) =>
        isWithinLastDays(
          getStudentIncomeDate(
            student
          ),
          30
        )
    );

  // ====================================================
  // CURRENT YEAR STUDENTS
  // ====================================================

  const yearlyStudents =
    joinedStudents.filter(
      (student) => {

        const dateValue =
          getDateValue(
            getStudentIncomeDate(
              student
            )
          );

        if (!dateValue) {
          return false;
        }

        return (
          dateValue.getFullYear() ===
          currentYear
        );
      }
    );

  // ====================================================
  // DOWNLOAD BUTTON
  // ====================================================

  const downloadButton =
    (
      label,
      rows
    ) => (

      <button
        type="button"
        className="secondary small"
        aria-label={`Download ${label}`}
        title={`Download ${label}`}
        style={{
          minWidth: "38px",
          width: "38px",
          height: "38px",
          padding: "0",
          display:
            "inline-flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontSize: "18px",
        }}
        onClick={() =>
          downloadIncome(
            label,
            rows
          )
        }
      >
        ⭳
      </button>

    );

  // ====================================================
  // INCOME CARDS
  // ====================================================

  const incomeCards = [
    {
      icon: "⚡",
      color: "green",

      value:
        `₹${incomeByRange(
          15
        ).toLocaleString(
          "en-IN"
        )}`,

      sub:
        "Last 15 days",

      action:
        downloadButton(
          "15 Days Income",
          last15DaysStudents
        ),
    },

    {
      icon: "▣",
      color: "blue",

      value:
        `₹${monthlyIncome.toLocaleString(
          "en-IN"
        )}`,

      sub:
        "Last 30 days",

      action:
        downloadButton(
          "Monthly Income",
          last30DaysStudents
        ),
    },

    {
      icon: "▥",
      color: "purple",

      value:
        `₹${yearlyIncome.toLocaleString(
          "en-IN"
        )}`,

      sub:
        `Year ${currentYear}`,

      action:
        downloadButton(
          "Yearly Income",
          yearlyStudents
        ),
    },
  ];

  // ====================================================
  // RECENT ENQUIRY ROW
  // ====================================================

const recentRow =
  (row, index) => [
    index + 1,

    row.candidate_name ||
      row.name ||
      "",

    row.mobile ||
      "",

    row.city ||
      "",

    typeof row.category === "object"
      ? row.category?.name || ""
      : row.category || "",

    row.course ||
      "",

    row.next_followup_date ||
      "",

    statusOf(row),
  ];

  // ====================================================
  // STATS
  // ====================================================

  const statsItems = [

    {
      icon: "▣",
      color: "blue",
      label:
        "Total Enquiries",
      value:
        totalEnquiries,
      sub:
        "Current Data",
    },

    {
      icon: "✓",
      color: "green",
      label:
        "Positive",
      value:
        positiveCount,
      sub: "",
    },

    {
      icon: "◷",
      color: "orange",
      label:
        "Pending",
      value:
        pendingCount,
      sub: "",
    },

    {
      icon: "↓",
      color: "red",
      label:
        "Negative",
      value:
        negativeCount,
      sub: "",
    },

    {
      icon: "♟",
      color: "purple",
      label:
        "Joined",
      value:
        joinedCount,
      sub: "",
    },

    ...incomeCards.map(
      (item) => ({

        icon:
          item.icon,

        color:
          item.color,

        label:
          item.label,

        value:
          item.value,

        sub:
          item.sub,

        action:
          item.action,

      })
    ),
  ];

  // ====================================================
  // PAGE
  // ====================================================

  return (
    <>

      {/* ==================================================
          ACCOUNT ACTION
      ================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >



      </div>

      {/* ==================================================
          DASHBOARD STATS
      ================================================== */}

      <Stats
        items={
          statsItems
        }
      />

      {/* ==================================================
          DASHBOARD GRID
      ================================================== */}

      <div className="dashboard-grid">

        {/* ==================================================
            JOINED STUDENTS BY CATEGORY
        ================================================== */}

        <Panel
          title="Joined Students by Category"
          subtitle="Current data"
        >

          <div className="chart-bars">

            {finalJoinedCounts.map(
              (item) => (

                <div
                  className="chart-row"
                  key={
                    item[0]
                  }
                >

                  <label>
                    {
                      item[0]
                    }
                  </label>

                  <div className="bar">

                    <i
                      style={{
                        width:
                          item[1] >
                          0
                            ? `${Math.max(
                                8,
                                (item[1] /
                                  maxCount) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />

                  </div>

                  <b>
                    {
                      item[1]
                    }
                  </b>

                </div>

              )
            )}

          </div>

        </Panel>

        {/* ==================================================
            OVERDUE FOLLOW UPS
        ================================================== */}

        <Panel
          title="Overdue Follow-ups"
          subtitle={`${allOverdue.length} follow-ups overdue`}
        >

          {overdue.length ? (

            overdue.map(
              (
                row,
                index
              ) => (

                <div
                  className="follow-item"
                  key={`${keyOf(
                    row
                  )}-${index}`}
                >

                  <div>

                    <strong>
                      {
                        row.candidate_name ||
                        row.name
                      }
                    </strong>

                    <small>
                      {
                        row.course
                      }
                    </small>

                    <small>
                      Due{" "}
                      {
                        row.next_followup_date
                      }
                    </small>

                  </div>

                  <Badge
                    status={statusOf(
                      row
                    )}
                  />

                </div>

              )
            )

          ) : (

            <div className="empty">
              No overdue
              follow-ups.
            </div>

          )}

          {allOverdue.length >
            4 && (

            <Link
              className="link-btn"
              to="/follow-ups"
            >
              View all
              follow-ups
            </Link>

          )}

        </Panel>

      </div>

      {/* ==================================================
          RECENT ENQUIRIES
      ================================================== */}

      <Panel
        title="Recent Enquiries"
        action={
          <Link
            className="link-btn"
            to="/enquiry-list"
          >
            View All
          </Link>
        }
        className="table-panel"
      >

        {/* ==================================================
            FILTERS
        ================================================== */}

        <div className="dashboard-filters">

          <input
            type="text"
            placeholder="Search candidate, mobile or city..."
            value={query}
            onChange={(
              event
            ) => {

              setQuery(
                event.target
                  .value
              );

              setPage(1);

            }}
          />

          <select
            value={status}
            onChange={(
              event
            ) => {

              setStatus(
                event.target
                  .value
              );

              setPage(1);

            }}
          >

            <option value="">
              All Status
            </option>

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

        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="table-scroll">

          <table>

            <thead>

              <tr>

                {[
                  "ID",
                  "Candidate",
                  "Mobile",
                  "City",
                  "Category",
                  "Course",
                  "Follow-up",
                  "Status",
                ].map(
                  (header) => (

                    <th
                      key={
                        header
                      }
                    >
                      {
                        header
                      }
                    </th>

                  )
                )}

              </tr>

            </thead>

            <tbody>

              {visibleRows.map(
                (
                  row,
                  index
                ) => {

               const values =
                recentRow(
                  row,
                  (page - 1) * 5 + index
                );

                  return (

                    <tr
                      key={`${keyOf(
                        row
                      )}-${index}`}
                    >

                      {values
                        .slice(
                          0,
                          7
                        )
                        .map(
                          (
                            value,
                            cell
                          ) => (

                            <td
                              key={
                                cell
                              }
                            >
                              {
                                value
                              }
                            </td>

                          )
                        )}

                      <td>

                        <Badge
                          status={statusOf(
                            row
                          )}
                        />

                      </td>

                    </tr>

                  );

                }
              )}

            </tbody>

          </table>

        </div>

        {/* ==================================================
            EMPTY
        ================================================== */}

        {!loading &&
          filtered.length ===
            0 && (

            <div className="empty">
              No enquiries
              match these
              filters.
            </div>

          )}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (

          <div className="empty">
            Loading
            dashboard...
          </div>

        )}

        {/* ==================================================
            PAGINATION
        ================================================== */}

        <Pagination
          page={page}
          setPage={setPage}
          total={
            filtered.length
          }
        />

      </Panel>

    </>
  );
}
