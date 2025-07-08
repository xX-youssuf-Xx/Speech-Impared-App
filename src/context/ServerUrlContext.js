import React, { createContext, useState, useEffect, useContext } from 'react';
import { getData } from '../utils/storage';

const ServerUrlContext = createContext(null);

export const ServerUrlProvider = ({ children }) => {
  const [serverUrl, setServerUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkServerUrl = async () => {
    setLoading(true);
    const url = await getData('serverUrl');
    setServerUrl(url);
    setLoading(false);
  };

  useEffect(() => {
    checkServerUrl();
  }, []);

  return (
    <ServerUrlContext.Provider value={{ serverUrl, loading, checkServerUrl }}>
      {children}
    </ServerUrlContext.Provider>
  );
};

export const useServerUrl = () => {
  const context = useContext(ServerUrlContext);
  if (!context) {
    throw new Error('useServerUrl must be used within a ServerUrlProvider');
  }
  return context;
}; 