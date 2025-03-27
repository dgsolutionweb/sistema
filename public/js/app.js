// API Configuration
const API_URL = 'http://localhost:3005/api';
axios.defaults.baseURL = API_URL;

// React Hooks
const { useState, useEffect, useContext } = React;

// Context for Authentication
const AuthContext = React.createContext(null);

// Auth Provider Component
const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => {
        try {
            return localStorage.getItem('token') || null;
        } catch (error) {
            console.error('Error reading token from localStorage:', error);
            return null;
        }
    });
    
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error('Error reading user from localStorage:', error);
            return null;
        }
    });
    
    const [isInitialized, setIsInitialized] = useState(false);

    const updateUserContext = (userData) => {
        if (!userData) return;
        
        try {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.error('Error updating user context:', error);
        }
    };

    const login = async (newToken, userData) => {
        if (!newToken || !userData) {
            throw new Error('Token e dados do usuário são necessários para login');
        }

        try {
            // Configure axios with the new token
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            
            // Test the token with a simple request
            await axios.get('/products');
            
            // If the request is successful, update the state and localStorage
            setToken(newToken);
            setUser(userData);
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.error('Error validating token:', error);
            logout();
            throw new Error('Falha na autenticação. Por favor, tente novamente.');
        }
    };

    const logout = () => {
        try {
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (token) {
                    // Configure axios with the stored token
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    
                    // Test the stored token
                    await axios.get('/products');
                }
            } catch (error) {
                console.error('Error during auth initialization:', error);
                logout();
            } finally {
                setIsInitialized(true);
            }
        };

        initializeAuth();
    }, [token]);

    // Debug: Log user state changes
    useEffect(() => {
        console.log('Current user state:', user);
    }, [user]);

    if (!isInitialized) {
        return <div className="spinner-overlay"><div className="spinner-border text-primary"></div></div>;
    }

    return (
        <AuthContext.Provider value={{ token, user, login, logout, updateUserContext }}>
            {children}
        </AuthContext.Provider>
    );
};

// Register Component
const Register = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        company: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/auth/register', formData);
            login(response.data.token, response.data.user);
        } catch (error) {
            setError(error.response && error.response.data && error.response.data.message 
                ? error.response.data.message 
                : 'Erro ao registrar usuário');
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h3 className="card-title text-center mb-4">Registro</h3>
                            {error && <div className="alert alert-danger">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Nome</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Senha</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Empresa</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.company}
                                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary w-100">Registrar</button>
                            </form>
                            <div className="text-center mt-3">
                                <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    setShowRegister(false);
                                }}>Já tem uma conta? Faça login</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Update Login Component
const Login = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [showRegister, setShowRegister] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/auth/login', formData);
            console.log('Login response:', response.data);

            if (response.data && response.data.token) {
                // Cria um objeto de usuário com os dados do login
                const userData = {
                    email: formData.email,
                    // Outros campos serão preenchidos quando o usuário abrir as configurações
                    name: '',
                    company: ''
                };

                // Configura o token e faz login
                await login(response.data.token, userData);
            } else {
                throw new Error('Token não recebido do servidor');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response && error.response.data && error.response.data.message 
                ? error.response.data.message 
                : 'Erro ao fazer login');
        }
    };

    if (showRegister) {
        return <Register />;
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h3 className="card-title text-center mb-4">Login</h3>
                            {error && <div className="alert alert-danger">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Senha</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary w-100">Entrar</button>
                            </form>
                            <div className="text-center mt-3">
                                <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    setShowRegister(true);
                                }}>Não tem uma conta? Registre-se</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Category Modal Component
const CategoryModal = ({ show, onHide, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({ name: '' });
        onHide();
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Nova Categoria</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Nome da Categoria</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Update Product Modal Component
const ProductModal = ({ show, onHide, product, categories, onSubmit }) => {
    const [formData, setFormData] = useState(product || {
        name: '',
        description: '',
        price: '',
        quantity: '',
        category: ''
    });

    useEffect(() => {
        if (product) {
            setFormData({
                ...product,
                price: product.price.toString()
            });
        }
    }, [product]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            price: parseFloat(formData.price)
        });
        onHide();
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h5 className="modal-title">{product ? 'Editar Produto' : 'Novo Produto'}</h5>
                    <button type="button" className="btn-close" onClick={onHide}></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="mb-3">
                            <label className="form-label">Nome</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Descrição</label>
                            <textarea
                                className="form-control"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Preço</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Quantidade</label>
                            <input
                                type="number"
                                className="form-control"
                                value={formData.quantity}
                                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Categoria</label>
                            <select
                                className="form-select"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                required
                            >
                                <option value="">Selecione uma categoria</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.name}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Movement Modal Component
const MovementModal = ({ show, onHide, products, onSubmit }) => {
    const [formData, setFormData] = useState({
        productId: '',
        type: 'entrada',
        quantity: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            productId: parseInt(formData.productId),
            quantity: parseInt(formData.quantity)
        });
        onHide();
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Nova Movimentação</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Produto</label>
                                <select
                                    className="form-select"
                                    value={formData.productId}
                                    onChange={(e) => setFormData({...formData, productId: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione um produto</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} - Estoque: {product.quantity}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Tipo</label>
                                <select
                                    className="form-select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    required
                                >
                                    <option value="entrada">Entrada</option>
                                    <option value="saida">Saída</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Quantidade</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-control"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Registrar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Update Dashboard Component
const Dashboard = () => {
    const { token, logout } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Ensure the token is set in axios headers
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const [statsRes, productsRes, categoriesRes, movementsRes] = await Promise.all([
                axios.get('/movements/stats'),
                axios.get('/products'),
                axios.get('/categories'),
                axios.get('/movements')
            ]);

            // Only update state if the component is still mounted and we have a token
            if (token) {
                setStats(statsRes.data);
                setProducts(productsRes.data);
                setCategories(categoriesRes.data);
                setMovements(movementsRes.data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            if (error.response && error.response.status === 401) {
                logout();
            } else {
                setError('Erro ao carregar dados. Por favor, tente novamente.');
            }
        } finally {
            if (token) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        let mounted = true;

        if (token && mounted) {
            fetchData();
        }

        return () => {
            mounted = false;
        };
    }, [token]);

    useEffect(() => {
        // Verifica a rota atual
        const path = window.location.pathname;
        if (path === '/buscar') {
            setCurrentPage('search');
        }
    }, []);

    const handleCategorySubmit = async (formData) => {
        try {
            await axios.post('/categories', formData);
            fetchData();
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
        }
    };

    const handleProductSubmit = async (formData) => {
        try {
            if (selectedProduct) {
                await axios.put(`/products/${selectedProduct.id}`, formData);
            } else {
                await axios.post('/products', formData);
            }
            fetchData();
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
        }
    };

    const handleMovementSubmit = async (formData) => {
        try {
            await axios.post('/movements', formData);
            fetchData();
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await axios.delete(`/products/${id}`);
                fetchData();
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
            }
        }
    };

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderContent = () => {
        switch (currentPage) {
            case 'search':
                return <ProductSearch />;
            default:
                return (
                    <div className="container-fluid py-4">
                        <div className="d-flex flex-wrap gap-2 mb-4">
                            <button 
                                className="btn btn-info" 
                                onClick={() => setShowCategoryModal(true)}
                            >
                                <i className="fas fa-tags me-2"></i>
                                Gerenciar Categorias
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => {
                                    setSelectedProduct(null);
                                    setShowProductModal(true);
                                }}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Novo Produto
                            </button>
                            <button 
                                className="btn btn-success" 
                                onClick={() => setShowMovementModal(true)}
                            >
                                <i className="fas fa-exchange-alt me-2"></i>
                                Nova Movimentação
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                    window.history.pushState({}, '', '/buscar');
                                    setCurrentPage('search');
                                }}
                            >
                                <i className="fas fa-search me-2"></i>
                                Buscar Produtos
                            </button>
                        </div>
                        
                        <div className="row stats mb-4">
                            <div className="col-xl-3 col-md-6">
                                <div className="stats-card products position-relative">
                                    <div>
                                        <div className="number">{products.length}</div>
                                        <div className="label">Total de Produtos</div>
                                    </div>
                                    <i className="fas fa-box icon"></i>
                                </div>
                            </div>
                            <div className="col-xl-3 col-md-6">
                                <div className="stats-card inputs position-relative">
                                    <div>
                                        <div className="number">{stats && stats.totalEntradas ? stats.totalEntradas : 0}</div>
                                        <div className="label">Entradas</div>
                                    </div>
                                    <i className="fas fa-arrow-circle-down icon"></i>
                                </div>
                            </div>
                            <div className="col-xl-3 col-md-6">
                                <div className="stats-card outputs position-relative">
                                    <div>
                                        <div className="number">{stats && stats.totalSaidas ? stats.totalSaidas : 0}</div>
                                        <div className="label">Saídas</div>
                                    </div>
                                    <i className="fas fa-arrow-circle-up icon"></i>
                                </div>
                            </div>
                            <div className="col-xl-3 col-md-6">
                                <div className="stats-card balance position-relative">
                                    <div>
                                        <div className="number">{stats ? (stats.quantidadeTotalEntrada - stats.quantidadeTotalSaida) : 0}</div>
                                        <div className="label">Saldo Total</div>
                                    </div>
                                    <i className="fas fa-dollar-sign icon"></i>
                                </div>
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                                        <h5 className="card-title mb-0">Produtos</h5>
                                        <div className="d-flex align-items-center w-100 w-md-auto">
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="fas fa-search"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Buscar produtos..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            <span className="badge bg-primary ms-2">{filteredProducts.length}</span>
                                        </div>
                                    </div>
                                    <div className="card-body p-0">
                                        <div className="product-list">
                                            {filteredProducts.map(product => (
                                                <div key={product.id} className="product-item p-3 border-bottom">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="product-info">
                                                            <h6 className="mb-1">{product.name}</h6>
                                                            <span className="badge bg-secondary mb-2">{product.category}</span>
                                                            <div className="product-details">
                                                                <div className="mb-1">
                                                                    <strong>Preço:</strong> R$ {parseFloat(product.price).toFixed(2)}
                                                                </div>
                                                                <div className="d-flex align-items-center">
                                                                    <strong>Estoque:</strong>
                                                                    <span className={`badge ms-2 bg-${product.quantity > 10 ? 'success' : product.quantity > 5 ? 'warning' : 'danger'}`}>
                                                                        {product.quantity} unidades
                                                                    </span>
                                                                </div>
                                                                {product.quantity <= 5 && (
                                                                    <div className="text-danger mt-1">
                                                                        <i className="fas fa-exclamation-triangle me-1"></i>
                                                                        Estoque Baixo
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="product-actions d-flex flex-column gap-2">
                                                            <button 
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => {
                                                                    setSelectedProduct(product);
                                                                    setShowProductModal(true);
                                                                }}
                                                            >
                                                                <i className="fas fa-edit me-1"></i>
                                                                Editar
                                                            </button>
                                                            <button 
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                            >
                                                                <i className="fas fa-trash me-1"></i>
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredProducts.length === 0 && (
                                                <div className="text-center p-4">
                                                    <i className="fas fa-box fa-3x text-muted mb-3 d-block"></i>
                                                    <p className="text-muted">Nenhum produto encontrado</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h5 className="card-title mb-0">Últimas Movimentações</h5>
                                        <span className="badge bg-secondary">{movements.length} movimentações</span>
                                    </div>
                                    <div className="card-body">
                                        <div className="table-responsive">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Produto</th>
                                                        <th>Tipo</th>
                                                        <th>Quantidade</th>
                                                        <th>Data</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {movements.map(movement => (
                                                        <tr key={movement.id}>
                                                            <td>
                                                                <div>
                                                                    <strong>{movement.product.name}</strong>
                                                                    <small className="d-block text-muted">{movement.product.category}</small>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`badge bg-${movement.type === 'entrada' ? 'success' : 'danger'}`}>
                                                                    {movement.type === 'entrada' ? 'Entrada' : 'Saída'}
                                                                </span>
                                                            </td>
                                                            <td>{movement.quantity}</td>
                                                            <td>
                                                                <div>
                                                                    {new Date(movement.createdAt).toLocaleDateString()}
                                                                    <small className="d-block text-muted">
                                                                        {new Date(movement.createdAt).toLocaleTimeString()}
                                                                    </small>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <React.Fragment>
            {renderContent()}
            <ProductModal
                show={showProductModal}
                onHide={() => setShowProductModal(false)}
                product={selectedProduct}
                categories={categories}
                onSubmit={handleProductSubmit}
            />

            <CategoryModal
                show={showCategoryModal}
                onHide={() => setShowCategoryModal(false)}
                onSubmit={handleCategorySubmit}
            />

            <MovementModal
                show={showMovementModal}
                onHide={() => setShowMovementModal(false)}
                products={products}
                onSubmit={handleMovementSubmit}
            />
        </React.Fragment>
    );
};

// Main App Component
const App = () => {
    const { token, logout } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState('dashboard');

    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/buscar') {
            setCurrentPage('search');
        }
    }, []);

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary">
                <div className="container-fluid">
                    <a className="navbar-brand d-flex align-items-center" href="/">
                        <span className="fw-bold" style={{ fontSize: '1.4rem', letterSpacing: '0.5px' }}>
                            C<span style={{ fontSize: '1.2rem' }}>&</span>D
                            <span style={{ marginLeft: '8px', fontWeight: '400' }}>Estoque</span>
                        </span>
                    </a>
                    {token && (
                        <div className="d-flex gap-2">
                            <button 
                                className="btn btn-outline-light" 
                                onClick={logout}
                            >
                                <i className="fas fa-sign-out-alt me-2"></i>
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </nav>
            {token ? (
                <React.Fragment>
                    <Dashboard />
                </React.Fragment>
            ) : (
                <Login />
            )}
        </div>
    );
};

// Render the app
ReactDOM.render(
    <AuthProvider>
        <App />
    </AuthProvider>,
    document.getElementById('root')
); 