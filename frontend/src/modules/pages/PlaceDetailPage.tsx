import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api";

export function PlaceDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const placeId = Number(params.id);
  const [place, setPlace] = useState<api.Place | null>(null);
  const [comments, setComments] = useState<api.Comment[]>([]);
  const [photos, setPhotos] = useState<api.Photo[]>([]);
  const [commentText, setCommentText] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || Number.isNaN(placeId)) return;
    Promise.all([
      api.getPlace(token, placeId),
      api.getComments(token, placeId),
      api.getPhotos(token, placeId)
    ])
      .then(([placeData, commentData, photoData]) => {
        setPlace(placeData);
        setComments(commentData);
        setPhotos(photoData);
      })
      .catch((err) => setError((err as Error).message));
  }, [token, placeId]);

  const updateStatus = async (nextStatus: api.PlaceStatus, favorite: boolean) => {
    if (!token || !place) return;
    try {
      const updated = await api.updateStatus(token, place.id, {
        status: nextStatus,
        isFavorite: favorite
      });
      setPlace(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addComment = async () => {
    if (!token || !place || !commentText.trim()) return;
    try {
      const saved = await api.addComment(token, place.id, commentText.trim());
      setComments((prev) => [...prev, saved]);
      setCommentText("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const uploadPhoto = async () => {
    if (!token || !place || !file) return;
    try {
      const saved = await api.uploadPhoto(token, place.id, file, caption);
      setPhotos((prev) => [...prev, saved]);
      setFile(null);
      setCaption("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!place) {
    return (
      <div className="centered">
        <p>Cargando detalle...</p>
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }

  return (
    <section className="detail-page">
      <button className="ghost-button" onClick={() => navigate(-1)}>
        Volver
      </button>
      <div className="detail-header">
        <div>
          <h2>{place.name}</h2>
          <p className="card-meta">{place.category?.name}</p>
          {place.address && <p className="card-meta">{place.address}</p>}
        </div>
        <span className={`status-pill status-pill--${place.status.toLowerCase()}`}>
          {place.status}
        </span>
      </div>

      <div className="detail-actions">
        <button
          className="ghost-button"
          onClick={() => updateStatus(place.status, !place.favorite)}
        >
          {place.favorite ? "Quitar favorito" : "Favorito"}
        </button>
        <button
          className="primary-button"
          onClick={() =>
            updateStatus(
              place.status === "PENDING" ? "VISITED" : "PENDING",
              place.favorite
            )
          }
        >
          {place.status === "PENDING" ? "Marcar visitado" : "Marcar pendiente"}
        </button>
      </div>

      {place.description && <p className="detail-description">{place.description}</p>}

      <div className="detail-section">
        <h3>Fotos</h3>
        <div className="photo-grid">
          {photos.map((photo) => {
            const photoSrc = token ? `${photo.url}?token=${token}` : photo.url;
            return (
            <figure key={photo.id} className="photo-card">
              <img src={photoSrc} alt={photo.caption || place.name} />
              <figcaption>{photo.caption || "Sin titulo"}</figcaption>
            </figure>
            );
          })}
        </div>
        <div className="form form-inline">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Caption opcional"
          />
          <button className="primary-button" onClick={uploadPhoto} disabled={!file}>
            Subir foto
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h3>Comentarios</h3>
        <div className="comment-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment">
              <strong>{comment.user.name}</strong>
              <p>{comment.text}</p>
            </div>
          ))}
        </div>
        <div className="form form-inline">
          <input
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Escribe un comentario"
          />
          <button className="primary-button" onClick={addComment} disabled={!commentText.trim()}>
            Comentar
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
    </section>
  );
}
