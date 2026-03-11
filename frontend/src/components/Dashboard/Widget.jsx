
export default function Widget({ icon, title, value, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div>
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  );
}
