import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import feverSalts from '../data/feverSalts.json';

export default function MedicineCompare() {
  const [medAImage, setMedAImage] = useState(null);
  const [medBImage, setMedBImage] = useState(null);
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Helper to extract active salt based on text keywords
  const detectSalt = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('paracetamol') || lower.includes('acetaminophen') || lower.includes('dolo') || lower.includes('crocin')) {
      return 'paracetamol';
    }
    if (lower.includes('ibuprofen') || lower.includes('advil') || lower.includes('brufen')) {
      return 'ibuprofen';
    }
    if (lower.includes('aspirin') || lower.includes('acetylsalicylic')) {
      return 'aspirin';
    }
    return null;
  };

  const handleImageUpload = (e, setImg) => {
    const file = e.target.files[0];
    if (file) {
      setImg(URL.createObjectURL(file));
    }
  };

  const runOCR = async () => {
    if (!medAImage && !medBImage) {
      alert('Please upload at least one medicine image.');
      return;
    }

    setLoading(true);
    try {
      const worker = await createWorker('eng');

      if (medAImage) {
        setStatus('Scanning Medicine A...');
        const retA = await worker.recognize(medAImage);
        setTextA(retA.data.text);
      }

      if (medBImage) {
        setStatus('Scanning Medicine B...');
        const retB = await worker.recognize(medBImage);
        setTextB(retB.data.text);
      }

      await worker.terminate();
      setStatus('Scan complete!');
    } catch (err) {
      console.error(err);
      setStatus('Error scanning images.');
    } finally {
      setLoading(false);
    }
  };

  const saltA = detectSalt(textA);
  const saltB = detectSalt(textB);
  const isDuplicate = saltA && saltB && saltA === saltB;

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#1e3a8a' }}>
        Medicine Strip Safety & OCR Comparison
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Medicine A */}
        <div style={{ border: '2px dashed #cbd5e1', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Medicine A</h3>
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setMedAImage)} style={{ margin: '10px 0' }} />
          {medAImage && <img src={medAImage} alt="Med A" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', marginTop: '10px' }} />}
          {textA && <div style={{ fontSize: '12px', background: '#f1f5f9', padding: '8px', marginTop: '10px', textAlign: 'left', maxHeight: '100px', overflowY: 'auto' }}><strong>Extracted:</strong> {textA}</div>}
        </div>

        {/* Medicine B */}
        <div style={{ border: '2px dashed #cbd5e1', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Medicine B</h3>
          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setMedBImage)} style={{ margin: '10px 0' }} />
          {medBImage && <img src={medBImage} alt="Med B" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', marginTop: '10px' }} />}
          {textB && <div style={{ fontSize: '12px', background: '#f1f5f9', padding: '8px', marginTop: '10px', textAlign: 'left', maxHeight: '100px', overflowY: 'auto' }}><strong>Extracted:</strong> {textB}</div>}
        </div>
      </div>

      <button
        onClick={runOCR}
        disabled={loading}
        style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
      >
        {loading ? status || 'Processing OCR...' : 'Extract & Compare Both Medicines'}
      </button>

      {/* Safety Analysis Results */}
      {(saltA || saltB) && (
        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: isDuplicate ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isDuplicate ? '#f87171' : '#4ade80'}` }}>
          <h3 style={{ color: isDuplicate ? '#991b1b' : '#166534', margin: '0 0 8px 0' }}>
            {isDuplicate ? '⚠️ Safety Warning: Duplicate Active Ingredient Detected!' : '✅ Combination Appears Safe'}
          </h3>
          {saltA && <p><strong>Medicine A Active Salt:</strong> {feverSalts[saltA]?.name} ({feverSalts[saltA]?.category})</p>}
          {saltB && <p><strong>Medicine B Active Salt:</strong> {feverSalts[saltB]?.name} ({feverSalts[saltB]?.category})</p>}
          {isDuplicate && (
            <p style={{ color: '#b91c1c', fontWeight: '500', marginTop: '8px' }}>
              {feverSalts[saltA]?.warning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
