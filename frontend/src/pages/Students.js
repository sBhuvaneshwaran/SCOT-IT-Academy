import React, { useEffect, useState } from "react";
import {
  studentApi,
  categoryApi,
} from "../services/api";

import {
  Panel,
  Pagination,
} from "../components/Ui";

// ======================================================
// INITIAL FORM
// ======================================================

const initialForm = {
  studentId: "",
  name: "",
  course: "",
  mobile: "",
  email: "",
  city: "",
  category: "",
  paidFee: "",
  balanceFee: "",
  totalFee: "",
  dueDate: "",
  joinDate: "",
  nextFollowUpDate: "",
  status: "Joined",
};

// ======================================================
// CHECK JOINED STUDENT
// ======================================================

const joinedOnly = (student) =>
  String(
    student.status ||
      student.final_status ||
      student.finalStatus ||
      ""
  ).toLowerCase() === "joined";

// ======================================================
// FORMAT DATE FOR INPUT TYPE="DATE"
// ======================================================

const formatDateForInput = (date) => {
  if (!date) return "";

  const value = String(date).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // ISO datetime
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value.substring(0, 10);
  }

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] =
      value.split("-");

    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] =
      value.split("/");

    return `${year}-${month}-${day}`;
  }

  return "";
};

// ======================================================
// GET NEXT FOLLOW-UP DATE
// ======================================================

const getNextFollowUpDate = (
  student = {}
) => {
  return formatDateForInput(
    student.nextFollowUpDate ||
      student.next_follow_up_date ||
      student.next_followup_date ||
      student.nextFollowupDate ||
      student.next_followup ||
      student.followUpDate ||
      student.follow_up_date ||
      ""
  );
};

// ======================================================
// STUDENT KEY
// ======================================================

const studentKey = (student = {}) => {
  const identity =
    student.id ||
    `${student.name ||
      student.candidate_name ||
      "student"}-${student.mobile ||
      student.mobile_no ||
      student.email ||
      student.course ||
      "unknown"}`;

  return String(identity);
};

// ======================================================
// NORMALIZE API DATA
// ======================================================

const normalize = (student = {}) => {
  const paidFee =
    Number(
      student.paidFee ??
        student.paid_fee ??
        0
    ) || 0;

  const balanceFee =
    Number(
      student.balanceFee ??
        student.balance_fee ??
        0
    ) || 0;

  const totalFee =
    Number(
      student.totalFee ??
        student.total_fee ??
        paidFee + balanceFee
    ) || 0;

  return {
    ...student,

    // ==================================================
    // ID
    // ==================================================

    id:
      student.id ||
      student.studentId ||
      "",

    // ==================================================
    // BASIC DETAILS
    // ==================================================

    name:
      student.name ||
      student.candidate_name ||
      "",

    course:
      student.course ||
      "",

    mobile:
      student.mobile ||
      student.mobile_no ||
      "",

    email:
      student.email ||
      "",

    city:
      student.city ||
      "",

    // ==================================================
    // CATEGORY
    // ==================================================

    category:
      student.category ||
      student.category_name ||
      student.categoryName ||
      "",

    // ==================================================
    // FEES
    // ==================================================

    paidFee,

    balanceFee,

    totalFee,

    // ==================================================
    // DUE DATE
    // ==================================================

    dueDate: formatDateForInput(
      student.dueDate ||
        student.due_date ||
        ""
    ),

    // ==================================================
    // JOIN DATE
    // ==================================================

    joinDate: formatDateForInput(
      student.joinDate ||
        student.join_date ||
        ""
    ),

    // ==================================================
    // NEXT FOLLOW-UP DATE
    // ==================================================

    nextFollowUpDate:
      getNextFollowUpDate(student),

    // ==================================================
    // STATUS
    // ==================================================

    status:
      student.status ||
      student.final_status ||
      student.finalStatus ||
      "Joined",
  };
};

// ======================================================
// MERGE STUDENTS
// ======================================================

const mergeStudents = (
  studentsList = []
) => {
  const map = new Map();

  studentsList.forEach((student) => {
    const item = normalize(student);
    const key = studentKey(item);

    if (!map.has(key)) {
      map.set(key, item);
      return;
    }

    map.set(key, {
      ...map.get(key),
      ...item,
    });
  });

  return [...map.values()];
};

// ======================================================
// FORMAT MONEY
// ======================================================

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString(
    "en-IN"
  );
};

// ======================================================
// NORMALIZE CATEGORY API DATA
// ======================================================

const normalizeCategories = (
  response
) => {
  const apiData =
    response?.data?.results ||
    response?.data?.data ||
    response?.data ||
    [];

  if (!Array.isArray(apiData)) {
    return [];
  }

  const categoryNames = apiData
    .map((item) => {
      // If API returns strings
      if (typeof item === "string") {
        return item.trim();
      }

      // If API returns object
      return String(
        item.name ||
          item.category ||
          item.category_name ||
          item.title ||
          ""
      ).trim();
    })
    .filter(Boolean);

  // Remove duplicate categories
  return [
    ...new Set(categoryNames),
  ];
};

// ======================================================
// STUDENTS COMPONENT
// ======================================================

export default function Students() {
  const [students, setStudents] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [formOpen, setFormOpen] =
    useState(false);

  const [form, setForm] =
    useState(initialForm);

  const [message, setMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [page, setPage] =
    useState(1);

  const [editingStudent, setEditingStudent] =
    useState(null);

  // ====================================================
  // CATEGORY STATE
  // ====================================================

  const [categories, setCategories] =
    useState([]);

  const [categoryLoading, setCategoryLoading] =
    useState(false);

  // ====================================================
  // LOAD CATEGORIES
  // ====================================================

  async function loadCategories() {
    try {
      setCategoryLoading(true);

      const response =
        await categoryApi.list();

      const categoryList =
        normalizeCategories(response);

      // console.log(
      //   "Categories loaded:",
      //   categoryList
      // );

      setCategories(categoryList);
    } catch (error) {
      console.error(
        "Category API loading failed:",
        error
      );

      console.error(
        "Category API error response:",
        error.response?.data
      );

      setCategories([]);
    } finally {
      setCategoryLoading(false);
    }
  }

  // ====================================================
  // LOAD STUDENTS + CATEGORIES
  // ====================================================

  useEffect(() => {
    loadCategories();

    studentApi
      .list()
      .then((response) => {
        const apiData =
          response.data?.results ||
          response.data ||
          [];

        const apiStudents =
          Array.isArray(apiData)
            ? apiData
                .filter(joinedOnly)
                .map(normalize)
            : [];

        setStudents(
          mergeStudents([
            ...apiStudents,
          ])
        );
      })
      .catch((error) => {
        console.error(
          "Student API loading failed:",
          error
        );

        console.error(
          "Student API error response:",
          error.response?.data
        );

        setStudents([]);
      });
  }, []);

  // ====================================================
  // PAGINATION
  // ====================================================

  const visibleStudents =
    students.slice(
      (page - 1) * 10,
      page * 10
    );

  // ====================================================
  // FORM CHANGE
  // ====================================================

  function change(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      // ==================================================
      // AUTOMATIC TOTAL FEE
      // ==================================================

      if (
        name === "paidFee" ||
        name === "balanceFee"
      ) {
        next.totalFee =
          (Number(next.paidFee) || 0) +
          (Number(next.balanceFee) || 0);
      }

      // ==================================================
      // CATEGORY
      // ==================================================

      if (name === "category") {
        next.category = value;
      }

      return next;
    });
  }

  // ====================================================
  // ADD / EDIT STUDENT
  // ====================================================

  async function addStudent(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    // ==================================================
    // DATE VALUES
    // ==================================================

    const editedDueDate =
      formatDateForInput(
        form.dueDate
      );

    const editedJoinDate =
      formatDateForInput(
        form.joinDate ||
          editingStudent?.joinDate ||
          editingStudent?.join_date ||
          ""
      );

    const editedNextFollowUpDate =
      formatDateForInput(
        form.nextFollowUpDate ||
          editingStudent?.nextFollowUpDate ||
          editingStudent?.next_follow_up_date ||
          editingStudent?.next_followup_date ||
          ""
      );

    // ==================================================
    // FEES
    // ==================================================

    const editedPaidFee =
      Number(form.paidFee) || 0;

    const editedBalanceFee =
      Number(form.balanceFee) || 0;

    const editedTotalFee =
      editedPaidFee +
      editedBalanceFee;

    // ==================================================
    // CATEGORY
    // ==================================================

    const selectedCategory =
      String(
        form.category || ""
      ).trim();

    if (!selectedCategory) {
      setMessage(
        "Please select a category."
      );

      setSaving(false);
      return;
    }

    // ==================================================
    // PREPARE STUDENT DATA
    // ==================================================

    const studentData = {
      ...form,

      id:
        form.studentId ||
        editingStudent?.id ||
        undefined,

      category:
        selectedCategory,

      paidFee:
        editedPaidFee,

      balanceFee:
        editedBalanceFee,

      totalFee:
        editedTotalFee,

      dueDate:
        editedDueDate,

      joinDate:
        editedJoinDate,

      nextFollowUpDate:
        editedNextFollowUpDate,

      status: "Joined",
    };

    // console.log(
    //   "Student data being saved:",
    //   studentData
    // );

    // ==================================================
    // EDIT EXISTING STUDENT
    // ==================================================

    if (editingStudent) {
      try {
        let updatedStudent;

        // =================================================
        // API STUDENT
        // =================================================

        if (
          editingStudent.id &&
          !String(
            editingStudent.id
          ).startsWith("local-")
        ) {
          const response =
            await studentApi.update(
              editingStudent.id,
              studentData
            );

          // console.log(
          //   "Update API response:",
          //   response.data
          // );

          const apiResponse =
            response.data || {};

          updatedStudent =
            normalize({
              ...editingStudent,

              ...apiResponse,

              // Keep selected category
              category:
                selectedCategory,

              dueDate:
                apiResponse.dueDate ||
                apiResponse.due_date ||
                editedDueDate,

              joinDate:
                apiResponse.joinDate ||
                apiResponse.join_date ||
                editedJoinDate,

              nextFollowUpDate:
                apiResponse.nextFollowUpDate ||
                apiResponse.next_follow_up_date ||
                apiResponse.next_followup_date ||
                editedNextFollowUpDate,

              paidFee:
                apiResponse.paidFee ??
                apiResponse.paid_fee ??
                editedPaidFee,

              balanceFee:
                apiResponse.balanceFee ??
                apiResponse.balance_fee ??
                editedBalanceFee,

              totalFee:
                apiResponse.totalFee ??
                apiResponse.total_fee ??
                editedTotalFee,
            });
        }

        // =================================================
        // LOCAL STUDENT
        // =================================================

        else {
          updatedStudent =
            normalize({
              ...editingStudent,

              ...studentData,

              category:
                selectedCategory,

              dueDate:
                editedDueDate,

              joinDate:
                editedJoinDate,

              nextFollowUpDate:
                editedNextFollowUpDate,

              paidFee:
                editedPaidFee,

              balanceFee:
                editedBalanceFee,

              totalFee:
                editedTotalFee,

              status: "Joined",
            });
        }

        // =================================================
        // FINAL SAFETY
        // =================================================

        updatedStudent = {
          ...updatedStudent,

          category:
            selectedCategory,

          dueDate:
            editedDueDate ||
            updatedStudent.dueDate ||
            "",

          joinDate:
            editedJoinDate ||
            updatedStudent.joinDate ||
            "",

          nextFollowUpDate:
            editedNextFollowUpDate ||
            updatedStudent.nextFollowUpDate ||
            "",

          paidFee:
            editedPaidFee,

          balanceFee:
            editedBalanceFee,

          totalFee:
            editedTotalFee,

          status: "Joined",
        };

        // console.log(
        //   "Final updated student:",
        //   updatedStudent
        // );

        // =================================================
        // UPDATE TABLE
        // =================================================

        setStudents((prev) =>
          prev.map((item) => {
            if (
              String(item.id) ===
              String(
                editingStudent.id
              )
            ) {
              return {
                ...item,

                ...updatedStudent,

                category:
                  selectedCategory,

                dueDate:
                  editedDueDate ||
                  updatedStudent.dueDate ||
                  item.dueDate ||
                  "",

                joinDate:
                  editedJoinDate ||
                  updatedStudent.joinDate ||
                  item.joinDate ||
                  "",

                nextFollowUpDate:
                  editedNextFollowUpDate ||
                  updatedStudent.nextFollowUpDate ||
                  item.nextFollowUpDate ||
                  "",

                paidFee:
                  editedPaidFee,

                balanceFee:
                  editedBalanceFee,

                totalFee:
                  editedTotalFee,

                status: "Joined",
              };
            }

            return item;
          })
        );

        // =================================================
        // UPDATE SELECTED VIEW
        // =================================================

        if (
          selected &&
          String(selected.id) ===
            String(
              editingStudent.id
            )
        ) {
          setSelected({
            ...selected,

            ...updatedStudent,

            category:
              selectedCategory,

            dueDate:
              editedDueDate ||
              updatedStudent.dueDate ||
              selected.dueDate ||
              "",

            joinDate:
              editedJoinDate ||
              updatedStudent.joinDate ||
              selected.joinDate ||
              "",

            nextFollowUpDate:
              editedNextFollowUpDate ||
              updatedStudent.nextFollowUpDate ||
              selected.nextFollowUpDate ||
              "",

            paidFee:
              editedPaidFee,

            balanceFee:
              editedBalanceFee,

            totalFee:
              editedTotalFee,

            status: "Joined",
          });
        }

        // =================================================
        // SUCCESS
        // =================================================

        setMessage(
          "Student details updated successfully."
        );

        setTimeout(() => {
          setFormOpen(false);
          setEditingStudent(null);
          setForm({
            ...initialForm,
          });
          setMessage("");
        }, 800);
      } catch (error) {
        console.error(
          "Student update failed:",
          error
        );

        console.error(
          "API error response:",
          error.response?.data
        );

        const apiMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to update student. Please check the API connection.";

        setMessage(apiMessage);
      }

      setSaving(false);
      return;
    }

    // ==================================================
    // ADD NEW STUDENT
    // ==================================================

    try {
      const response =
        await studentApi.create(
          studentData
        );

      const savedStudent =
        normalize({
          ...response.data,

          category:
            selectedCategory,
        });

      setStudents((prev) =>
        mergeStudents([
          ...prev,
          savedStudent,
        ])
      );

      setMessage(
        "Student added successfully."
      );

      setTimeout(() => {
        setFormOpen(false);
        setForm({
          ...initialForm,
        });
        setMessage("");
      }, 800);
    } catch (error) {
      console.error(
        "API create failed:",
        error
      );

      console.error(
        "API error response:",
        error.response?.data
      );

      const apiMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to save student. Please check the API connection.";

      setMessage(apiMessage);
    }

    setSaving(false);
  }

  // ====================================================
  // VIEW STUDENT
  // ====================================================

  function openView(student) {
    setSelected(student);
  }

  // ====================================================
  // EDIT STUDENT
  // ====================================================

  function openEdit(student) {
    // Refresh categories whenever edit is opened
    loadCategories();

    const nextFollowUpDate =
      getNextFollowUpDate(student);

    // console.log(
    //   "Editing student:",
    //   student
    // );

    setEditingStudent(student);

    setForm({
      studentId:
        student.id || "",

      name:
        student.name || "",

      course:
        student.course || "",

      mobile:
        student.mobile || "",

      email:
        student.email || "",

      city:
        student.city || "",

      category:
        student.category ||
        student.category_name ||
        student.categoryName ||
        "",

      paidFee:
        student.paidFee ?? "",

      balanceFee:
        student.balanceFee ?? "",

      totalFee:
        student.totalFee ??
        (
          (Number(
            student.paidFee
          ) || 0) +
          (Number(
            student.balanceFee
          ) || 0)
        ),

      dueDate:
        formatDateForInput(
          student.dueDate ||
            student.due_date ||
            ""
        ),

      joinDate:
        formatDateForInput(
          student.joinDate ||
            student.join_date ||
            ""
        ),

      nextFollowUpDate,

      status: "Joined",
    });

    setMessage("");
    setFormOpen(true);
  }

  // ====================================================
  // DELETE STUDENT
  // ====================================================

  async function remove(student) {
    const confirmDelete =
      window.confirm(
        `Are you sure you want to delete ${student.name}?`
      );

    if (!confirmDelete) {
      return;
    }

    try {
      // =================================================
      // DELETE API
      // =================================================

      if (
        student.id &&
        !String(
          student.id
        ).startsWith("local-")
      ) {
        await studentApi.delete(
          student.id
        );
      }

      // =================================================
      // REMOVE FROM REACT
      // =================================================

      setStudents((prev) =>
        prev.filter(
          (item) =>
            String(item.id) !==
            String(student.id)
        )
      );

      // =================================================
      // CLOSE VIEW
      // =================================================

      if (
        selected &&
        String(selected.id) ===
          String(student.id)
      ) {
        setSelected(null);
      }

      // =================================================
      // FIX PAGINATION
      // =================================================

      const remaining =
        students.length - 1;

      const maxPage =
        Math.max(
          1,
          Math.ceil(
            remaining / 10
          )
        );

      if (page > maxPage) {
        setPage(maxPage);
      }
    } catch (error) {
      console.error(
        "Delete student failed:",
        error
      );

      alert(
        "Unable to delete student. Please check the API connection."
      );
    }
  }

  // ====================================================
  // CLOSE FORM
  // ====================================================

  function closeForm() {
    setFormOpen(false);
    setEditingStudent(null);

    setForm({
      ...initialForm,
    });

    setMessage("");
  }

  // ====================================================
  // OPEN ADD STUDENT
  // ====================================================

  function openAddStudent() {
    // IMPORTANT:
    // Reload categories every time Add Student opens.
    // So changes from Categories page are reflected.

    loadCategories();

    setEditingStudent(null);

    setForm({
      ...initialForm,

      // IMPORTANT:
      // Do NOT use Development here.
      category: "",
    });

    setFormOpen(true);
    setMessage("");
  }

  // ====================================================
  // RETURN UI
  // ====================================================

  return (
    <>
      {/* ==================================================
          STUDENTS PANEL
      ================================================== */}

      <Panel
        title="Students Details"
        subtitle="Joined students and their fee details"
        action={
          <button
            type="button"
            className="primary"
            onClick={
              openAddStudent
            }
          >
            + Add Student
          </button>
        }
      >
        {/* ==================================================
            RESPONSIVE TABLE
        ================================================== */}

        <div className="students-table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>#</th>

                <th>
                  Student ID
                </th>

                <th>
                  Student Name
                </th>

                <th>
                  Course
                </th>

                <th>
                  Total Fee
                </th>

                <th>
                  Paid Fee
                </th>

                <th>
                  Balance Fee
                </th>

                <th>
                  Due Date
                </th>

                <th className="action-column">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleStudents.length >
              0 ? (
                visibleStudents.map(
                  (
                    student,
                    index
                  ) => {
                    const paidFee =
                      Number(
                        student.paidFee
                      ) || 0;

                    const balanceFee =
                      Number(
                        student.balanceFee
                      ) || 0;

                    const totalFee =
                      paidFee +
                      balanceFee;

                    return (
                      <tr
                        key={
                          student.id ||
                          `${student.name}-${index}`
                        }
                      >
                        {/* NUMBER */}

                        <td className="number-cell">
                          {(page -
                            1) *
                            10 +
                            index +
                            1}
                        </td>

                        {/* STUDENT ID */}

                        <td className="student-id-cell">
                          {student.id ||
                            "-"}
                        </td>

                        {/* NAME */}

                        <td className="student-name-cell">
                          <strong>
                            {student.name ||
                              "-"}
                          </strong>
                        </td>

                        {/* COURSE */}

                        <td>
                          {student.course ||
                            "-"}
                        </td>

                        {/* TOTAL FEE */}

                        <td className="total-fee-cell">
                          ₹
                          {formatMoney(
                            totalFee
                          )}
                        </td>

                        {/* PAID FEE */}

                        <td className="fee-cell">
                          ₹
                          {formatMoney(
                            paidFee
                          )}
                        </td>

                        {/* BALANCE FEE */}

                        <td className="fee-cell">
                          ₹
                          {formatMoney(
                            balanceFee
                          )}
                        </td>

                        {/* DUE DATE */}

                        <td className="date-cell">
                          {student.dueDate ||
                            "-"}
                        </td>

                        {/* ACTIONS */}

                        <td className="action-column">
                          <div className="student-action-buttons">

                            {/* VIEW */}

                            <button
                              type="button"
                              className="icon-btn view-action"
                              aria-label={`View ${student.name}`}
                              title="View"
                              onClick={() =>
                                openView(
                                  student
                                )
                              }
                            >
                              👁
                            </button>

                            {/* EDIT */}

                            <button
                              type="button"
                              className="icon-btn edit-action"
                              aria-label={`Edit ${student.name}`}
                              title="Edit"
                              onClick={() =>
                                openEdit(
                                  student
                                )
                              }
                            >
                              ✎
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              className="icon-btn delete-btn"
                              aria-label={`Delete ${student.name}`}
                              title="Delete"
                              onClick={() =>
                                remove(
                                  student
                                )
                              }
                            >
                              🗑
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="no-students"
                  >
                    No joined students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ==================================================
            PAGINATION
        ================================================== */}

        <Pagination
          page={page}
          setPage={setPage}
          total={students.length}
        />
      </Panel>

      {/* ==================================================
          ADD / EDIT MODAL
      ================================================== */}

      {formOpen && (
        <div
          className="modal-backdrop"
          onClick={closeForm}
        >
          <form
            className="modal edit-modal students-modal"
            onSubmit={
              addStudent
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div className="modal-header">
              <div>
                <h3>
                  {editingStudent
                    ? "Edit Student"
                    : "Add Student"}
                </h3>

                <p>
                  {editingStudent
                    ? "Update student and fee details"
                    : "Add a joined student and fee details"}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeForm
                }
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <div className="form-grid">

              {/* ==================================================
                  BASIC FIELDS
              ================================================== */}

              {[
                [
                  "studentId",
                  "Student ID",
                ],

                [
                  "name",
                  "Student Name",
                ],

                [
                  "course",
                  "Course",
                ],

                [
                  "mobile",
                  "Mobile Number",
                ],

                [
                  "email",
                  "Email",
                ],

                [
                  "city",
                  "City",
                ],

                [
                  "paidFee",
                  "Paid Fee",
                ],

                [
                  "balanceFee",
                  "Balance Fee",
                ],

                [
                  "totalFee",
                  "Total Fee",
                ],
              ].map(
                ([
                  name,
                  label,
                ]) => (
                  <div
                    className="form-group"
                    key={name}
                  >
                    <label>
                      {label}
                    </label>

                    <input
                      name={name}
                      value={
                        form[name] ??
                        ""
                      }
                      onChange={
                        change
                      }
                      type={
                        name ===
                          "paidFee" ||
                        name ===
                          "balanceFee" ||
                        name ===
                          "totalFee"
                          ? "number"
                          : name ===
                              "mobile"
                          ? "tel"
                          : name ===
                              "email"
                          ? "email"
                          : "text"
                      }
                      required={
                        name ===
                          "studentId" ||
                        name ===
                          "name" ||
                        name ===
                          "course"
                      }
                      readOnly={
                        name ===
                        "totalFee"
                      }
                    />
                  </div>
                )
              )}

              {/* ==================================================
                  CATEGORY
              ================================================== */}

              <div className="form-group">
                <label>
                  Category
                </label>

                <select
                  name="category"
                  value={
                    form.category ||
                    ""
                  }
                  onChange={
                    change
                  }
                  required
                >
                  {/* FIRST OPTION */}

                  <option value="">
                    {categoryLoading
                      ? "Loading Categories..."
                      : "Select Category"}
                  </option>

                  {/* DYNAMIC CATEGORIES */}

                  {categories.map(
                    (
                      category
                    ) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {
                          category
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* ==================================================
                  DUE DATE
              ================================================== */}

              <div className="form-group">
                <label>
                  Due Date
                </label>

                <input
                  type="date"
                  name="dueDate"
                  value={
                    form.dueDate ||
                    ""
                  }
                  onChange={
                    change
                  }
                  required
                />
              </div>

              {/* ==================================================
                  JOIN DATE
              ================================================== */}

              <div className="form-group">
                <label>
                  Join Date
                </label>

                <input
                  type="date"
                  name="joinDate"
                  value={
                    form.joinDate ||
                    ""
                  }
                  onChange={
                    change
                  }
                  required={
                    !editingStudent
                  }
                  readOnly={
                    !!editingStudent
                  }
                />
              </div>

            </div>

            {/* ==================================================
                MESSAGE
            ================================================== */}

            {message && (
              <div
                className={
                  message.includes(
                    "Unable"
                  ) ||
                  message.includes(
                    "Please select"
                  )
                    ? "error-message"
                    : "success-message"
                }
              >
                {message}
              </div>
            )}

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={
                  closeForm
                }
              >
                Close
              </button>

              <button
                type="submit"
                className="primary"
                disabled={
                  saving ||
                  categoryLoading
                }
              >
                {saving
                  ? "Saving..."
                  : editingStudent
                  ? "Update Student"
                  : "Add Student"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================
          VIEW STUDENT MODAL
      ================================================== */}

      {selected && (
        <div
          className="student-detail-modal"
          onClick={() =>
            setSelected(null)
          }
        >
          <div
            className="student-detail-content"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div className="student-modal-header">
              <div>
                <h3>
                  Student Details
                </h3>

                <p>
                  Complete student information
                </p>
              </div>

              <button
                type="button"
                className="secondary small"
                onClick={() =>
                  setSelected(null)
                }
              >
                Close
              </button>
            </div>

            {/* DETAILS */}

            <div className="student-details-grid">

              {[
                [
                  "Student ID",
                  selected.id,
                ],

                [
                  "Student Name",
                  selected.name,
                ],

                [
                  "Course",
                  selected.course,
                ],

                [
                  "Mobile",
                  selected.mobile,
                ],

                [
                  "Email",
                  selected.email,
                ],

                [
                  "City",
                  selected.city,
                ],

                [
                  "Category",
                  selected.category,
                ],

                [
                  "Paid Fee",
                  `₹${formatMoney(
                    selected.paidFee
                  )}`,
                ],

                [
                  "Balance Fee",
                  `₹${formatMoney(
                    selected.balanceFee
                  )}`,
                ],

                [
                  "Total Fee",
                  `₹${formatMoney(
                    Number(
                      selected.paidFee
                    ) +
                      Number(
                        selected.balanceFee
                      )
                  )}`,
                ],

                [
                  "Due Date",
                  selected.dueDate,
                ],

                [
                  "Join Date",
                  selected.joinDate,
                ],

                [
                  "Next Follow-up Date",
                  getNextFollowUpDate(
                    selected
                  ),
                ],
              ].map(
                ([
                  label,
                  value,
                ]) => (
                  <div
                    className={
                      label ===
                      "Total Fee"
                        ? "detail-box total-detail-box"
                        : "detail-box"
                    }
                    key={
                      label
                    }
                  >
                    <span>
                      {label}
                    </span>

                    <strong>
                      {value ||
                        "-"}
                    </strong>
                  </div>
                )
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}