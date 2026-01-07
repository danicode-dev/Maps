import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api";
import { getActiveGroupId, setActiveGroupId } from "../utils/storage";

export function GroupPage() {
  const { token } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [invite, setInvite] = useState<api.InviteResponse | null>(null);
  const [activeId, setActiveId] = useState<number | null>(getActiveGroupId());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!token || !groupName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const created = await api.createGroup(token, groupName.trim());
      setActiveGroupId(created.id);
      setActiveId(created.id);
      setInvite(null);
      setGroupName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!token || !joinCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const joined = await api.joinGroup(token, joinCode.trim());
      setActiveGroupId(joined.id);
      setActiveId(joined.id);
      setInvite(null);
      setJoinCode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!token || !activeId) {
      setError("Selecciona un grupo activo");
      return;
    }
    setError(null);
    try {
      const inviteResponse = await api.createInvite(token, activeId);
      setInvite(inviteResponse);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="group-page">
      <div className="card">
        <h2>Grupo activo</h2>
        <p className="card-meta">
          {activeId ? `Grupo #${activeId}` : "Aun no hay grupo activo"}
        </p>
        <button className="ghost-button" onClick={handleInvite} disabled={!activeId}>
          Generar codigo de invitacion
        </button>
        {invite && (
          <div className="invite-card">
            <strong>Codigo: {invite.code}</strong>
            <span>Expira: {new Date(invite.expiresAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="group-grid">
        <div className="card">
          <h3>Crear grupo</h3>
          <input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Nombre del grupo"
          />
          <button className="primary-button" onClick={handleCreate} disabled={loading}>
            Crear
          </button>
        </div>

        <div className="card">
          <h3>Unirse con codigo</h3>
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Codigo de invitacion"
          />
          <button className="primary-button" onClick={handleJoin} disabled={loading}>
            Unirse
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
    </section>
  );
}
