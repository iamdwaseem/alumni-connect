import React, { useState, useEffect, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  CalendarDays,
  UserRound,
  LogOut,
  ArrowUpRight,
  Search,
  Plus,
  MapPin,
  Building2,
  ArrowLeft,
} from "lucide-react";
import "./style.css";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
async function api(path, options = {}) {
  const token = sessionStorage.getItem("token");
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.message || "Request failed");
  return data.data;
}
const Auth = createContext();
const useAuth = () => useContext(Auth);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem("token")) {
      setReady(true);
      return;
    }
    api("/api/auth/me")
      .then(setUser)
      .catch(() => sessionStorage.removeItem("token"))
      .finally(() => setReady(true));
  }, []);
  return (
    <Auth.Provider
      value={{
        user,
        ready,
        login: (data) => {
          sessionStorage.setItem("token", data.token);
          setUser(data.user);
        },
        logout: () => {
          sessionStorage.removeItem("token");
          setUser(null);
        },
      }}
    >
      {children}
    </Auth.Provider>
  );
}
function useData(path) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    api(path)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return { data, error, reload: () => setTick((n) => n + 1) };
}
function ErrorBox({ text }) {
  return text ? (
    <div className="error" role="alert">
      {text}
    </div>
  ) : null;
}
function Loading() {
  return (
    <p className="muted" role="status">
      Loading your community…
    </p>
  );
}
function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-mark">
        <GraduationCap size={24} />
      </span>
      <span>
        alumni<span className="brand-light">connect</span>
        <small>VNR VJIET · COMMUNITY PORTAL</small>
      </span>
    </Link>
  );
}
function Shell() {
  const { user, ready, logout } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app">
      <aside>
        <Brand />
        <div className="nav-caption">YOUR COMMUNITY</div>
        <nav>
          {[
            ["/app", "Overview", LayoutDashboard],
            ["/app/alumni", "Alumni directory", Users],
            ["/app/events", "Events", CalendarDays],
            ...(user.role === "alumni"
              ? [["/app/me", "My profile", UserRound]]
              : []),
          ].map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <GraduationCap />
          <h3>Connections that last.</h3>
          <p>Your college journey is just the beginning.</p>
        </div>
        <div className="account">
          <span className="avatar">{user.name[0]}</span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === "admin" ? "Administrator" : "Alumni member"}
            </small>
          </div>
          <button className="icon" title="Sign out" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Community / <strong>Alumni Connect</strong>
          </span>
          <span className="badge">
            {user.role === "admin" ? "Admin workspace" : "Member workspace"}
          </span>
        </header>
        <div className="content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="alumni" element={<Directory />} />
            <Route path="alumni/new" element={<ProfileForm />} />
            <Route path="alumni/:id" element={<ProfilePage />} />
            <Route path="alumni/:id/edit" element={<ProfileForm />} />
            <Route path="me" element={<MyProfile />} />
            <Route path="events" element={<Events />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <footer>
          Alumni Connect{" "}
          <span>Built for connections. Powered by community.</span>
        </footer>
      </main>
    </div>
  );
}
function Landing() {
  return (
    <div className="landing">
      <header>
        <Brand />
        <Link className="button secondary" to="/login">
          Sign in <ArrowUpRight size={16} />
        </Link>
      </header>
      <section>
        <p className="eyebrow">ONCE A STUDENT. ALWAYS CONNECTED.</p>
        <h1>
          Your next chapter.
          <br />
          <em>Your same community.</em>
        </h1>
        <p className="lead">
          Reconnect with familiar faces, share your journey, and discover what
          comes next. Welcome to the VNR VJIET alumni community.
        </p>
        <div className="actions">
          <Link className="button" to="/register">
            Join the community <ArrowUpRight size={18} />
          </Link>
          <Link to="/login">Already a member? Sign in</Link>
        </div>
        <div className="landing-grid">
          {[
            [
              "01",
              "Find your people",
              "Explore alumni across batches, branches, and careers.",
            ],
            [
              "02",
              "Keep growing",
              "Meet, learn, and reconnect at community events.",
            ],
            [
              "03",
              "Share your story",
              "Keep your professional journey up to date.",
            ],
          ].map(([n, t, p]) => (
            <article key={n}>
              <small>{n} / CONNECT</small>
              <h2>{t}</h2>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <footer>Alumni Connect · A MERN + DevOps course prototype</footer>
    </div>
  );
}
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  ...props
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        {...props}
      />
    </label>
  );
}
const blank = {
  fullName: "",
  email: "",
  rollNumber: "",
  branch: "CSE",
  graduationYear: new Date().getFullYear(),
  phone: "",
  location: "",
  company: "",
  jobTitle: "",
  skills: "",
  achievements: "",
  linkedInUrl: "",
};
function AuthPage({ register = false }) {
  const [form, setForm] = useState({ ...blank, password: "" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { login, user } = useAuth();
  const nav = useNavigate();
  if (user) return <Navigate to="/app" />;
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = register
        ? { ...form, skills: [], achievements: [] }
        : { email: form.email, password: form.password };
      login(
        await api("/api/auth/" + (register ? "register" : "login"), {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      nav("/app");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand />
        <p className="eyebrow">A COMMUNITY BEYOND CAMPUS</p>
        <h1>
          Good connections.
          <br />
          <em>Great possibilities.</em>
        </h1>
        <p>People you know. Paths you haven't discovered yet.</p>
        <span className="seal">
          <GraduationCap size={85} />
        </span>
      </div>
      <div className="auth-form">
        <Link to="/" className="back">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <h2>{register ? "Your community awaits." : "Welcome back."}</h2>
        <p className="muted">
          {register
            ? "Create your alumni account to get started."
            : "Sign in to pick up where you left off."}
        </p>
        <form onSubmit={submit}>
          <ErrorBox text={error} />
          {register && (
            <>
              <Field
                label="Full name"
                name="fullName"
                value={form.fullName}
                onChange={change}
                required
              />
              <div className="form-grid">
                <Field
                  label="Roll number"
                  name="rollNumber"
                  value={form.rollNumber}
                  onChange={change}
                  required
                />
                <Field
                  label="Branch"
                  name="branch"
                  value={form.branch}
                  onChange={change}
                  required
                />
              </div>
              <Field
                label="Graduation year"
                name="graduationYear"
                type="number"
                min="1950"
                max="2100"
                value={form.graduationYear}
                onChange={change}
                required
              />
            </>
          )}
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={change}
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 10 : 1}
            maxLength={72}
            value={form.password}
            onChange={change}
            required
          />
          {register && (
            <small className="muted">Use at least 10 characters.</small>
          )}
          <button disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}{" "}
            <ArrowUpRight size={17} />
          </button>
        </form>
        <p>
          {register ? "Already a member?" : "New to the community?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
function PageTitle({ eyebrow, title, description, children }) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
function Dashboard() {
  const { user } = useAuth(),
    stats = useData("/api/dashboard"),
    alumni = useData("/api/alumni"),
    events = useData("/api/events");
  return (
    <>
      <PageTitle
        eyebrow="THE NEXT CHAPTER STARTS HERE"
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="A little closer to your community, every day."
      />
      <section className="hero">
        <div>
          <span className="pill">
            CONNECTED BY COLLEGE. UNITED BY POSSIBILITY.
          </span>
          <h2>
            Different journeys.
            <br />
            One community.
          </h2>
          <p>
            Find familiar faces. Make new connections.
            <br />
            Keep the conversations going.
          </p>
          <Link className="button light" to="/app/alumni">
            Explore the directory <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="orbit o1" />
          <span className="orbit o2" />
          <span className="art-core">
            <GraduationCap size={66} />
          </span>
          <span className="art-letter a1">A</span>
          <span className="art-letter a2">V</span>
          <span className="art-letter a3">M</span>
        </div>
      </section>
      <ErrorBox text={stats.error} />
      <div className="stats">
        {[
          [Users, stats.data?.alumni, "Alumni in our network"],
          [Building2, stats.data?.companies, "Companies represented"],
          [CalendarDays, stats.data?.events, "Upcoming events"],
        ].map(([Icon, n, t]) => (
          <article key={t}>
            <Icon size={22} />
            <strong>{n ?? "—"}</strong>
            <span>{t}</span>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Meet the community</h2>
            <Link to="/app/alumni">View all ↗</Link>
          </div>
          <ErrorBox text={alumni.error} />
          {!alumni.data && !alumni.error ? (
            <Loading />
          ) : (
            alumni.data?.slice(0, 4).map((p) => (
              <Link
                className="person-row"
                key={p._id}
                to={"/app/alumni/" + p._id}
              >
                <span className="avatar">{initials(p.fullName)}</span>
                <div>
                  <strong>{p.fullName}</strong>
                  <small>
                    {p.jobTitle || p.branch} {p.company && `· ${p.company}`}
                  </small>
                </div>
                <span className="batch">Class of {p.graduationYear}</span>
                <ArrowUpRight size={16} />
              </Link>
            ))
          )}
          {alumni.data?.length === 0 && (
            <p className="muted">
              Your community starts here. Add the first alumni profile.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>On the calendar</h2>
            <Link to="/app/events">All events ↗</Link>
          </div>
          <ErrorBox text={events.error} />
          {events.data
            ?.filter((e) => new Date(e.eventDate) > new Date())
            .slice(0, 2)
            .map((e) => (
              <div className="event-mini" key={e._id}>
                <DateTile date={e.eventDate} />
                <div>
                  <h3>{e.title}</h3>
                  <p>
                    <MapPin size={13} /> {e.venue}
                  </p>
                </div>
              </div>
            ))}
          {events.data &&
            !events.data.some((e) => new Date(e.eventDate) > new Date()) && (
              <p className="muted">No upcoming events yet. Check back soon.</p>
            )}
          <div className="note">
            A conversation today could open a door tomorrow.
          </div>
        </section>
      </div>
    </>
  );
}
const initials = (n) =>
  n
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
function Directory() {
  const { user } = useAuth(),
    [search, setSearch] = useState(""),
    [year, setYear] = useState("");
  const { data, error } = useData(
    "/api/alumni?search=" +
      encodeURIComponent(search) +
      "&year=" +
      encodeURIComponent(year),
  );
  return (
    <>
      <PageTitle
        eyebrow="PEOPLE MAKE THE COMMUNITY"
        title="Alumni directory"
        description="Different batches. Shared beginnings. Find your next connection."
      >
        {user.role === "admin" && (
          <Link className="button" to="/app/alumni/new">
            <Plus size={18} /> Add alumni
          </Link>
        )}
      </PageTitle>
      <div className="filterbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search alumni"
            placeholder="Search by name, company, branch or roll number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <input
          className="year"
          aria-label="Graduation year filter"
          type="number"
          placeholder="Graduation year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>
      <ErrorBox text={error} />
      {!data && !error ? (
        <Loading />
      ) : (
        <>
          <p className="muted">
            {data?.length || 0} alumni found · showing up to 500 records
          </p>
          <div className="alumni-grid">
            {data?.map((p) => (
              <Link
                className="alumni-card"
                to={"/app/alumni/" + p._id}
                key={p._id}
              >
                <div className="card-top">
                  <span className="avatar large">{initials(p.fullName)}</span>
                  <ArrowUpRight size={19} />
                </div>
                <h2>{p.fullName}</h2>
                <p>{p.jobTitle || "Alumni member"}</p>
                <p className="company">
                  <Building2 size={14} />
                  {p.company || "Career details coming soon"}
                </p>
                <div className="card-bottom">
                  <span>
                    {p.branch} · {p.graduationYear}
                  </span>
                  <span>{p.location || "—"}</span>
                </div>
              </Link>
            ))}
          </div>
          {data?.length === 0 && (
            <div className="empty">
              No alumni match your search. Try a different name or year.
            </div>
          )}
        </>
      )}
    </>
  );
}
function MyProfile() {
  const { data, error } = useData("/api/alumni?mine=true");
  if (error) return <ErrorBox text={error} />;
  if (!data) return <Loading />;
  return data[0] ? (
    <Navigate replace to={"/app/alumni/" + data[0]._id} />
  ) : (
    <p>Your profile is unavailable. Contact the administrator.</p>
  );
}
function ProfilePage() {
  const { id } = useParams(),
    { user } = useAuth(),
    { data: p, error } = useData("/api/alumni/" + id),
    nav = useNavigate(),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function remove() {
    if (
      !confirm(
        "Delete this profile? If linked to an alumni login, its account and event registrations will also be removed. This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    try {
      await api("/api/alumni/" + id, { method: "DELETE" });
      nav("/app/alumni");
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }
  if (error) return <ErrorBox text={error} />;
  if (!p) return <Loading />;
  return (
    <>
      <Link className="back" to="/app/alumni">
        <ArrowLeft size={16} /> Directory
      </Link>
      <PageTitle
        eyebrow={`${p.branch} · CLASS OF ${p.graduationYear}`}
        title={p.fullName}
        description={`${p.jobTitle || "Alumni member"}${p.company ? " at " + p.company : ""}`}
      >
        <div className="actions">
          {(user.role === "admin" || p.userId === user.id) && (
            <Link className="button" to={"/app/alumni/" + id + "/edit"}>
              Edit profile
            </Link>
          )}
          {user.role === "admin" && (
            <button className="danger" disabled={busy} onClick={remove}>
              Delete
            </button>
          )}
        </div>
      </PageTitle>
      <ErrorBox text={err} />
      <div className="panel profile">
        <span className="avatar xl">{initials(p.fullName)}</span>
        <div>
          <h2>About this alumnus</h2>
          <dl>
            {[
              ["Email", p.email],
              ["Roll number", p.rollNumber],
              ["Location", p.location],
              ["Phone", p.phone],
              ["Company", p.company],
              ["Role", p.jobTitle],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "Not added yet"}</dd>
              </div>
            ))}
          </dl>
          <h3>Skills</h3>
          <div className="tags">
            {p.skills?.length
              ? p.skills.map((s, i) => <span key={i}>{s}</span>)
              : "No skills added yet."}
          </div>
          <h3>Achievements</h3>
          {p.achievements?.length ? (
            <ul>
              {p.achievements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No achievements added yet.</p>
          )}
          {p.linkedInUrl?.startsWith("https://") && (
            <a href={p.linkedInUrl} target="_blank" rel="noreferrer">
              Professional profile ↗
            </a>
          )}
        </div>
      </div>
    </>
  );
}
function ProfileForm() {
  const { id } = useParams(),
    { user } = useAuth(),
    nav = useNavigate(),
    [form, setForm] = useState(blank),
    [loaded, setLoaded] = useState(!id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (id)
      api("/api/alumni/" + id)
        .then((p) => {
          setForm({
            ...p,
            skills: p.skills.join(", "),
            achievements: p.achievements.join(", "),
          });
          setLoaded(true);
        })
        .catch((e) => setError(e.message));
  }, [id]);
  if (!id && user.role !== "admin") return <Navigate to="/app" />;
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = {
        ...form,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        achievements: form.achievements
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const p = await api("/api/alumni" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      nav("/app/alumni/" + p._id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR JOURNEY, UP TO DATE"
        title={id ? "Edit alumni profile" : "Add an alumnus"}
        description="Share the details that help your community connect."
      />
      <ErrorBox text={error} />
      {loaded && (
        <form className="panel edit-form" onSubmit={submit}>
          <div className="form-grid">
            {Object.entries(blank).map(([name]) => (
              <Field
                key={name}
                label={
                  {
                    fullName: "Full name",
                    rollNumber: "Roll number",
                    graduationYear: "Graduation year",
                    jobTitle: "Job title",
                    linkedInUrl: "Professional URL",
                    skills: "Skills (comma separated)",
                    achievements: "Achievements (comma separated)",
                  }[name] || name[0].toUpperCase() + name.slice(1)
                }
                name={name}
                value={form[name]}
                type={
                  name === "graduationYear"
                    ? "number"
                    : name === "email"
                      ? "email"
                      : "text"
                }
                required={[
                  "fullName",
                  "email",
                  "rollNumber",
                  "branch",
                  "graduationYear",
                ].includes(name)}
                disabled={name === "email" && !!form.userId}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              />
            ))}
          </div>
          <div className="actions">
            <button disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
            <Link to={id ? "/app/alumni/" + id : "/app/alumni"}>Cancel</Link>
          </div>
        </form>
      )}
    </>
  );
}
function DateTile({ date }) {
  const d = new Date(date);
  return (
    <div className="date-tile">
      <span>{d.toLocaleDateString("en", { month: "short" })}</span>
      <strong>{d.getDate()}</strong>
    </div>
  );
}
function Events() {
  const { user } = useAuth(),
    { data, error, reload } = useData("/api/events"),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState({
      title: "",
      description: "",
      eventDate: "",
      venue: "",
    }),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  async function action(path, method, body) {
    setBusy(true);
    setErr("");
    try {
      await api(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      reload();
      return true;
    } catch (e) {
      setErr(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    if (
      await action(
        "/api/events" + (editing === "new" ? "" : "/" + editing),
        editing === "new" ? "POST" : "PUT",
        { ...form, eventDate: new Date(form.eventDate).toISOString() },
      )
    )
      setEditing(null);
  }
  function edit(e) {
    setEditing(e ? e._id : "new");
    setForm(
      e
        ? {
            title: e.title,
            description: e.description,
            venue: e.venue,
            eventDate: new Date(
              new Date(e.eventDate).getTime() -
                new Date(e.eventDate).getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16),
          }
        : { title: "", description: "", eventDate: "", venue: "" },
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="MAKE TIME TO RECONNECT"
        title="Community events"
        description="Good conversations start when we come together."
      >
        {user.role === "admin" && (
          <button onClick={() => edit(null)}>
            <Plus size={18} /> Create event
          </button>
        )}
      </PageTitle>
      <ErrorBox text={error || err} />
      {editing && (
        <form className="panel edit-form" onSubmit={save}>
          <h2>{editing === "new" ? "Create event" : "Edit event"}</h2>
          <div className="form-grid">
            {["title", "venue", "eventDate"].map((name) => (
              <Field
                key={name}
                label={
                  name === "eventDate"
                    ? "Date and time"
                    : name[0].toUpperCase() + name.slice(1)
                }
                name={name}
                type={name === "eventDate" ? "datetime-local" : "text"}
                value={form[name]}
                required
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              />
            ))}
          </div>
          <label>
            Description
            <textarea
              required
              minLength={5}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <div className="actions">
            <button disabled={busy}>Save event</button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {!data && !error ? (
        <Loading />
      ) : (
        <div className="events-grid">
          {data?.map((e) => (
            <article className="panel event-card" key={e._id}>
              <div className="event-card-top">
                <DateTile date={e.eventDate} />
                <span className="badge">
                  {new Date(e.eventDate) < new Date()
                    ? "Past event"
                    : "Upcoming"}
                </span>
              </div>
              <h2>{e.title}</h2>
              <p>{e.description}</p>
              <p className="muted">
                <MapPin size={15} /> {e.venue}
              </p>
              <small>{new Date(e.eventDate).toLocaleString()}</small>
              <p className="muted">{e.attendeeCount} registered</p>
              {user.role === "admin" ? (
                <>
                  <div className="actions">
                    <button className="secondary" onClick={() => edit(e)}>
                      Edit
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() =>
                        confirm("Permanently delete this event?") &&
                        action("/api/events/" + e._id, "DELETE")
                      }
                    >
                      Delete
                    </button>
                  </div>
                  <details>
                    <summary>View registrations ({e.attendeeCount})</summary>
                    {e.attendees?.map((u) => (
                      <p key={u._id}>
                        {u.name} · {u.email}
                      </p>
                    ))}
                  </details>
                </>
              ) : (
                <button
                  disabled={
                    busy || e.registered || new Date(e.eventDate) < new Date()
                  }
                  onClick={() =>
                    action("/api/events/" + e._id + "/register", "POST")
                  }
                >
                  {e.registered
                    ? "✓ You’re registered"
                    : new Date(e.eventDate) < new Date()
                      ? "Event ended"
                      : "Register for event"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {data?.length === 0 && (
        <div className="empty">
          No events yet. Your next community gathering will appear here.
        </div>
      )}
    </>
  );
}
function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <Link to="/app">Back to your community</Link>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />
        <Route path="/app/*" element={<Shell />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
);
