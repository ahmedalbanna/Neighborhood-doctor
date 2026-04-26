import React from 'react';
import { X, FileText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: any;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({ isOpen, onClose, patientData }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                   <User size={24} />
                 </div>
                 <h2 className="font-black text-xl text-[#2D2D2D]">الملف الطبي</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-bg-base hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
               <div className="p-4 bg-bg-base rounded-2xl border border-border-subtle">
                  <p className="font-bold text-brand text-sm mb-1">الحالات المزمنة</p>
                  <p className="text-sm text-gray-600">{patientData?.medicalHistory?.conditions || 'لا يوجد'}</p>
               </div>
               <div className="p-4 bg-bg-base rounded-2xl border border-border-subtle">
                  <p className="font-bold text-brand text-sm mb-1">العلاجات السابقة</p>
                  <p className="text-sm text-gray-600">{patientData?.medicalHistory?.treatments || 'لا يوجد'}</p>
               </div>
               <div className="p-4 bg-bg-base rounded-2xl border border-border-subtle">
                  <p className="font-bold text-brand text-sm mb-1">الحساسية</p>
                  <p className="text-sm text-gray-600">{patientData?.medicalHistory?.allergies || 'لا يوجد'}</p>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
