import React, { useEffect, useState } from "react";
import { Panel } from "../components/Ui";
import { categoryApi } from "../services/api";

const toRecord = item => typeof item === "string" ? {id: item, name: item} : item;

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    reload().catch(() => setRows([]));
  }, []);

  const visible = rows.filter(category => category.name.toLowerCase().includes(query.toLowerCase()));

  async function reload() {
    const response = await categoryApi.list();
    const values = (response.data.results || response.data || []).map(toRecord);
    setRows(values);
  }

  async function add(event) {
    event.preventDefault();
    const value = name.trim();

    if (!value) {
      setError("Category name is required.");
      return;
    }

    if (rows.some(item => item.name.toLowerCase() === value.toLowerCase())) {
      setError("This category already exists.");
      return;
    }

    try {
      setError("");
      await categoryApi.create({ name: value });
      setName("");
      setFormOpen(false);
      await reload();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add category.");
    }
  }

  async function update(event) {
    event.preventDefault();
    const value = name.trim();

    if (!value || !editing) {
      setError("Please enter a valid category name.");
      return;
    }

    try {
      setError("");
      await categoryApi.update(editing.id, { name: value });
      setEditing(null);
      setName("");
      await reload();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update category.");
    }
  }

  async function remove(category) {
    if (!window.confirm(`Delete category ${category.name}?`)) return;

    try {
      setError("");
      await categoryApi.remove(category.id);
      setRows(current => current.filter(item => item.id !== category.id));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete category.");
    }
  }

  return <Panel title="Categories" subtitle="Manage enquiry categories" action={<div className="category-toolbar"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search categories..." /><button className="primary" onClick={() => { setEditing(null); setName(""); setFormOpen(true); }}>+ Add Category</button></div>}>
    {error && <div className="login-error">{error}</div>}
    {(formOpen || editing) && <form className="category-form" onSubmit={editing ? update : add}>{editing && <strong>Editing: {editing.name}</strong>}<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder={editing ? "Edit category name" : "New category name"} required /><button className="primary">{editing ? "Update Category" : "Add Category"}</button><button type="button" className="secondary" onClick={() => { setEditing(null); setFormOpen(false); setName(""); setError(""); }}>Close</button></form>}
    <div className="category-grid">{visible.map(category => <div className="category-card" key={category.id}><div className="category-icon">▦</div><h3>{category.name}</h3><p>Enquiry category</p><div className="card-actions"><button className="icon-btn" title="Edit" aria-label={`Edit ${category.name}`} onClick={() => { setEditing(category); setName(category.name); setError(""); }}>✎</button><button className="icon-btn delete-btn" title="Delete" aria-label={`Delete ${category.name}`} onClick={() => remove(category)}>🗑</button></div></div>)}</div>{visible.length === 0 && <div className="empty">No categories found.</div>}
  </Panel>;
}
