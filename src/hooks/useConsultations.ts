import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  status: 'pending' | 'active' | 'replied' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  description: string;
  summary: string;
  audioUrl?: string;
  createdAt: any;
  updatedAt: any;
  detectedDialect?: string;
}

export function useConsultations(role: 'patient' | 'doctor', userId: string) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let q;
    if (role === 'patient') {
      q = query(
        collection(db, 'consultations'),
        where('patientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    } else {
      // Doctors see pending or their assigned active ones
      // For simplicity, we'll fetch all active/pending and filter in UI or use a more complex query
      q = query(
        collection(db, 'consultations'),
        where('status', 'in', ['pending', 'active', 'replied']),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Consultation[];
      setConsultations(data);
      setLoading(false);
    }, (error) => {
      console.error("Consultations snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [role, userId]);

  return { consultations, loading };
}
