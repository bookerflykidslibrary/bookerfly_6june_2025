import React, { createContext, useContext, useState } from 'react';

const CatalogContext = createContext();

export const CatalogProvider = ({ children }) => {
    const [availableBooks, setAvailableBooks] = useState([]);

    return (
        <CatalogContext.Provider value={{ availableBooks, setAvailableBooks }}>
            {children}
        </CatalogContext.Provider>
    );
};

export const useCatalog = () => useContext(CatalogContext);
