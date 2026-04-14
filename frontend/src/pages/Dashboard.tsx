import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>NEXUS</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>
            {user?.firstName} {user?.lastName}
          </span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Projects</h2>
          <Link to="/projects/new">
            <button>+ New Project</button>
          </Link>
        </div>
        <p style={{ color: '#666' }}>No projects yet. Create one to get started.</p>
      </section>
    </div>
  );
}
