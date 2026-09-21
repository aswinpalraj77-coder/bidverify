"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";

export function DocumentViewer({ bidId, selectedCheck }) {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    // Attempt to load the document image from localStorage
    const savedDoc = localStorage.getItem(`bid_doc_${bidId}`);
    if (savedDoc) {
      setDocData(savedDoc);
    }
    setLoading(false);
  }, [bidId]);

  useEffect(() => {
    if (selectedCheck && selectedCheck.bbox && imgRef.current && highlightRef.current) {
      // Small delay to ensure render
      setTimeout(() => {
        if (highlightRef.current) {
          highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 100);
    }
  }, [selectedCheck]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--paper)", borderRadius: 10, border: "1px solid var(--border)" }}>
        <Loader2 className="spin" size={24} color="var(--slate)" />
      </div>
    );
  }

  if (!docData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400, background: "var(--bg)", borderRadius: 10, border: "1px dashed var(--border)", color: "var(--slate-light)" }}>
        <ImageOff size={32} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Document unavailable</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>This prototype relies on local storage.</div>
      </div>
    );
  }

  // Calculate scaled highlight coordinates based on image natural size vs rendered size
  let highlightStyles = { display: 'none' };
  
  if (selectedCheck && selectedCheck.bbox && imgRef.current) {
    const { x0, y0, x1, y1 } = selectedCheck.bbox;
    
    const natW = imgRef.current.naturalWidth || 1;
    const natH = imgRef.current.naturalHeight || 1;
    const clientW = imgRef.current.clientWidth;
    const clientH = imgRef.current.clientHeight;

    const scaleX = clientW / natW;
    const scaleY = clientH / natH;

    highlightStyles = {
      display: 'block',
      position: 'absolute',
      left: x0 * scaleX - 4, // slight padding
      top: y0 * scaleY - 4,
      width: (x1 - x0) * scaleX + 8,
      height: (y1 - y0) * scaleY + 8,
      border: '3px solid var(--risk)',
      backgroundColor: 'rgba(235, 68, 90, 0.15)', // transparent red
      borderRadius: 4,
      pointerEvents: 'none',
      transition: 'all 0.3s ease',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', // Dim the rest of the image
      zIndex: 10
    };
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: "relative", 
        width: "100%", 
        height: "100%", 
        minHeight: 600,
        overflow: "auto", 
        background: "#e4e8eb", 
        borderRadius: 10, 
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center"
      }}
    >
      <div style={{ position: "relative", margin: "20px" }}>
        <img 
          ref={imgRef}
          src={docData} 
          alt="Bid Document" 
          style={{ maxWidth: "100%", display: "block", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} 
        />
        <div ref={highlightRef} style={highlightStyles}></div>
      </div>
    </div>
  );
}
