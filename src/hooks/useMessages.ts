import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'voice' | 'prescription' | 'image';
  text?: string; // used for prescription short desc
  createdAt: any;
}

export function useMessages(consultationId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!consultationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `consultations/${consultationId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(data);
      setLoading(false);
    }, (error) => {
      console.error("Messages snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [consultationId]);

  return { messages, loading };
}
