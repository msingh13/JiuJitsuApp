import React, { useEffect, useRef, useState } from "react";

// Mobile capture opens the device camera; desktop capture uses MediaRecorder.
export default function VideoCapture({ disabled, maxMB, onCapture, onBusy }) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const preview = useRef(null);
  const recorder = useRef(null);
  const stream = useRef(null);
  const active = useRef(true);
  const timer = useRef(null);
  function release() {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    };
  }, []);
  useEffect(() => {
    if (recording && preview.current)
      preview.current.srcObject = stream.current;
  }, [recording]);
  async function start() {
    setError("");
    setStarting(true);
    onBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "This browser cannot record here. Use the device camera option or upload a saved video.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      if (!active.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const type = ["video/mp4", "video/webm"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!type)
        throw new Error(
          "Recording format is not supported. Record with your device camera and upload the video.",
        );
      const rec = new MediaRecorder(media, {
        mimeType: type,
        videoBitsPerSecond: 2000000,
      });
      recorder.current = rec;
      const chunks = [];
      let bytes = 0;
      let tooLarge = false;
      let failed = false;
      rec.ondataavailable = (event) => {
        bytes += event.data.size;
        if (bytes > maxMB * 1024 * 1024) {
          tooLarge = true;
          if (rec.state === "recording") rec.stop();
        } else chunks.push(event.data);
      };
      rec.onerror = () => {
        failed = true;
        if (active.current)
          setError(
            "Recording failed. Please try again or upload a saved video.",
          );
        if (rec.state !== "inactive") rec.stop();
        release();
        if (active.current) {
          setRecording(false);
          onBusy(false);
        }
      };
      rec.onstop = async () => {
        release();
        if (!active.current) return;
        setRecording(false);
        if (failed || tooLarge || !chunks.some((chunk) => chunk.size)) {
          if (!failed)
            setError(
              tooLarge
                ? `Recording exceeded ${maxMB} MB. Try a shorter clip.`
                : "No video was captured. Please try again.",
            );
          onBusy(false);
          return;
        }
        const file = new File(
          chunks,
          `training-${Date.now()}.${type === "video/mp4" ? "mp4" : "webm"}`,
          { type },
        );
        await onCapture(file);
        if (active.current) onBusy(false);
      };
      rec.start(1000);
      setRecording(true);
      setSeconds(0);
      const began = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - began) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 180 && rec.state === "recording") rec.stop();
      }, 1000);
    } catch (e) {
      release();
      if (active.current) {
        setError(
          e.name === "NotAllowedError"
            ? "Camera or microphone access was denied. Allow access in your browser, or upload a saved video."
            : e.message,
        );
        onBusy(false);
      }
    } finally {
      if (active.current) setStarting(false);
    }
  }
  return (
    <div className="video-capture">
      <div className="capture-actions">
        <button
          type="button"
          className="button"
          disabled={disabled || starting}
          onClick={start}
        >
          Record in browser
        </button>
        <label className="capture-button">
          Use device camera
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            capture="environment"
            disabled={disabled || starting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onCapture(file);
            }}
          />
        </label>
      </div>
      {starting && (
        <p role="status">Waiting for camera and microphone permission…</p>
      )}
      {recording && (
        <div className="recording-preview">
          <video
            ref={preview}
            autoPlay
            muted
            playsInline
            aria-label="Live camera preview"
          />
          <p role="status">
            Recording · {Math.floor(seconds / 60)}:
            {String(seconds % 60).padStart(2, "0")}
          </p>
          <button
            type="button"
            className="button danger"
            onClick={() => {
              if (recorder.current?.state === "recording")
                recorder.current.stop();
            }}
          >
            Stop and attach video
          </button>
        </div>
      )}
      <p className="muted small">
        Browser clips stop after 3 minutes. On phones, use the device camera; on
        computers it may open the file picker. Save the entry to keep your clip.
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
