import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
}

interface AuthContextType {
    isAuthenticated: boolean | null; // null means "checking"
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const auth = localStorage.getItem("nova_auth");
            if (auth) {
                try {
                    const parsed = JSON.parse(auth);
                    // Check expiry (7 days)
                    if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                        setIsAuthenticated(true);
                        setUser(parsed.user);
                        return;
                    }
                } catch (e) {
                    localStorage.removeItem("nova_auth");
                }
            }

            // Fallback: double check with API
            try {
                const res = await fetch('/api/auth');
                if (res.ok) {
                    const data = await res.json();
                    setIsAuthenticated(true);
                    setUser(data.user);
                    // Sync back to local storage
                    localStorage.setItem("nova_auth", JSON.stringify({
                        authenticated: true,
                        user: data.user,
                        timestamp: Date.now()
                    }));
                } else {
                    setIsAuthenticated(false);
                }
            } catch (e) {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    const login = (userData: User) => {
        localStorage.setItem("nova_auth", JSON.stringify({
            authenticated: true,
            user: userData,
            timestamp: Date.now()
        }));
        setIsAuthenticated(true);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem("nova_auth");
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
