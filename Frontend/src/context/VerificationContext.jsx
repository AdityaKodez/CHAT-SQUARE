import { createContext, useContext, useState } from 'react';

const VerificationContext = createContext();

export const VerificationProvider = ({ children }) => {
  const [showVerification, setShowVerification] = useState(false);

  const openVerification = () => setShowVerification(true);
  const closeVerification = () => setShowVerification(false);

  return (
    <VerificationContext.Provider 
      value={{ 
        showVerification, 
        openVerification, 
        closeVerification 
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
};

export const useVerification = () => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
};
