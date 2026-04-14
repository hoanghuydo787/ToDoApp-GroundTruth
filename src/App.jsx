import { useEffect, useMemo, useState } from 'react'

const STORAGE_READ_KEY = 'todo_tasks'
//bug 01: write key differs from read key, so saved todos are never loaded on refresh.
const STORAGE_WRITE_KEY = 'todotasks'
const FILTER_STORAGE_KEY = 'todoapp.filter'

function readTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_READ_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    //bug 02: parsed todo items are not shape-validated, so corrupt localStorage data can cause runtime/UI issues.
    return parsed
  } catch {
    return []
  }
}

function writeTodos(todos) {
  try {
    localStorage.setItem(STORAGE_WRITE_KEY, JSON.stringify(todos))
  } catch {
  }
}

function newTodo(text) {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
  }
}

export default function App() {
  const [todos, setTodos] = useState(() => readTodos())
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState(
    //bug 03: stored filter value is not validated; invalid values produce inconsistent UI state (no active tab).
    () => localStorage.getItem(FILTER_STORAGE_KEY) || 'all',
  )

  const remainingCount = useMemo(
    () => todos.reduce((acc, t) => acc + (t.completed ? 0 : 1), 0),
    [todos],
  )

  useEffect(() => {
    writeTodos(todos)
  }, [todos])

  useEffect(() => {
    //bug 04: localStorage.setItem is unguarded; storage write errors can throw and break updates.
    localStorage.setItem(FILTER_STORAGE_KEY, filter)
  }, [filter])

  const visibleTodos = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.completed)
    if (filter === 'completed') return todos.filter((t) => t.completed)
    return todos
  }, [todos, filter])

  function onAddTodo(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    if (todos.some((t) => t.text === text)) return
    setTodos([...todos, newTodo(text)])
    setDraft('')
  }

  function toggleTodo(id) {
    setTodos((prev) => {
      const next = [...prev]
      const index = next.findIndex((t) => t.id === id)
      if (index === -1) return prev
      //bug 05: this always sets completed=true, preventing users from unchecking a todo.
      next[index].completed = true
      return next
    })
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  function clearCompleted() {
  //bug 06: filter condition keeps completed todos instead of removing them.
    setTodos((prev) => prev.filter((t) => t.completed))
  }

  return (
    <div className="app">
      <main className="card">
        <header className="header">
          <h1>Todo App</h1>
          <p className="subtitle">Simple React todo list with localStorage.</p>
        </header>

        <form className="composer" onSubmit={onAddTodo}>
          <input
            className="input"
            value={draft}
            placeholder="Add a task..."
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Todo text"
          />
          <button className="button" type="submit">
            Add
          </button>
        </form>

        <div className="filters" role="tablist" aria-label="Filter todos">
          {(['all', 'active', 'completed']).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`filterTab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Completed'}
            </button>
          ))}
        </div>

        <section className="list" aria-label="Todo list">
          {visibleTodos.length === 0 ? (
            <div className="empty">No todos yet. Add your first task.</div>
          ) : (
            <ul className="ul">
              {visibleTodos.map((t) => (
                <li key={t.id} className={`li ${t.completed ? 'done' : ''}`}>
                  <label className="row">
                    <input
                      type="checkbox"
                      checked={!!t.completed}
                      onChange={() => toggleTodo(t.id)}
                      aria-label={`Mark todo "${t.text}" as complete`}
                    />
                    <span className="text">{t.text}</span>
                  </label>
                  <button
                    className="iconButton"
                    type="button"
                    onClick={() => deleteTodo(t.id)}
                    aria-label={`Delete todo "${t.text}"`}
                    title="Delete"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="footer">
          <div className="meta">
            <strong>{remainingCount}</strong> items left
          </div>
          <div className="footerActions">
            <button
              className="button secondary"
              type="button"
              onClick={clearCompleted}
            >
              Clear completed
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}
